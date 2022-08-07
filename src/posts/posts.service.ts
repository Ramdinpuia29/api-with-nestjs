import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isDataURI } from 'class-validator';
import User from 'src/users/user.entity';
import { FindManyOptions, In, MoreThan, Repository } from 'typeorm';
import CreatePostDto from './dto/create-post.dto';
import UpdatePostDto from './dto/update-post.dto';
import PostNotFoundException from './exception/post-not-found.exception';
import Post from './post.entity';
import PostsSearchService from './posts-search.service';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private postsRepository: Repository<Post>,
        private postsSearchService: PostsSearchService
    ) { }

    /**
     * @Function to get all posts from the database
     * @returns All the posts from the database
     */
    async getAllPosts(offset?: number, limit?: number, startId?: number) {
        const where: FindManyOptions<Post>['where'] = {};
        let separateCount = 0;
        if (startId) {
            where.id = MoreThan(startId);
            separateCount = await this.postsRepository.count();
        }

        const [items, count] = await this.postsRepository.findAndCount({
            relations: ['author'],
            order: {
                id: 'ASC'
            },
            skip: offset,
            take: limit
        });

        return {
            items,
            count: startId ? separateCount : count
        };
    }

    /**
     * @Function to get a post with an id
     * @param id An id of a post. A post with this id should exist in the database
     * @returns The details of the post of the id
     */
    async getPostById(id: number) {
        const post = await this.postsRepository.findOne({ where: { id } });
        if (post) {
            return post;
        };
        throw new PostNotFoundException(id);
    }

    /**
     * @Function to create a new post
     * @param post The data of the post to be created
     * @param user An user data. The user should exist in the database
     * @returns The details of the created post.
     */
    async createPost(post: CreatePostDto, user: User) {
        const newPost = this.postsRepository.create({
            ...post,
            author: user
        });
        await this.postsRepository.save(newPost);
        this.postsSearchService.indexPost(newPost);
        return newPost;
    }

    /**
     * @Function to update an existing post
     * @param id An id of a post. A post with this id should exist in the database
     * @param post The data of the post to be updated
     * @returns The details of the updated post
     */
    async updatePost(id: number, post: UpdatePostDto) {
        await this.postsRepository.update(id, post);
        const updatedPost = await this.postsRepository.findOne({ where: { id }, relations: ['author'] });
        if (updatedPost) {
            await this.postsSearchService.update(updatedPost);
            return updatedPost;
        }
        throw new PostNotFoundException(id);
    };

    /**
     * @Function to delete a post from the database
     * @param id An id of a post. A post with this id should exist in the database
     */
    async deletePost(id: number) {
        const deleteResponse = await this.postsRepository.delete(id);
        if (!deleteResponse.affected) {
            throw new PostNotFoundException(id);
        }
        await this.postsSearchService.remove(id);
    };

    /**
     * @Function to search a post that contains the query string
     * @param text A string which a post should contain
     * @param offset The offset for the searched posts
     * @param limit Maximum number of posts to be returned
     * @param startId The starting id
     * @returns The posts found with the total number of the posts found
     */
    async searchForPosts(text: string, offset?: number, limit?: number, startId?: number) {
        const { results, count } = await this.postsSearchService.search(text, offset, limit, startId);
        const ids = results.map((result) => result.id);
        if (!ids.length) {
            return {
                items: [],
                count
            };
        }

        const items = await this.postsRepository.find({
            where: { id: In(ids) }
        });

        return {
            items,
            count
        };
    }
}
