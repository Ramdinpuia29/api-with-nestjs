import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isDataURI } from 'class-validator';
import User from 'src/users/user.entity';
import { In, Repository } from 'typeorm';
import CreatePostDto from './dto/createPost.dto';
import UpdatePostDto from './dto/updatePost.dto';
import PostNotFoundException from './exception/postNotFound.exception';
import Post from './post.entity';
import PostsSearchService from './postsSearch.service';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private postsRepository: Repository<Post>,
        private postsSearchService: PostsSearchService
    ) { }

    /* 
    FUNCTION TO GET ALL POSTS
    */
    getAllPosts() {
        return this.postsRepository.find({ relations: ['author'] });
    }

    /* 
    FUNCTION TO GET POST BY ID
    */
    async getPostById(id: number) {
        const post = await this.postsRepository.findOne({ where: { id } });
        if (post) {
            return post;
        };
        throw new PostNotFoundException(id);
    }

    /* 
    FUNCTION TO CREATE NEW POST
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

    /* 
    FUNCTION TO UPDATE POST BY ID
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

    /* 
    FUNCTION TO DELETE POST BY ID
    */
    async deletePost(id: number) {
        const deleteResponse = await this.postsRepository.delete(id);
        if (!deleteResponse.affected) {
            throw new PostNotFoundException(id);
        }
        await this.postsSearchService.remove(id);
    };

    /* 
    FUNCTION TO SEARCH POST USING 'text' QUERY
    IT WILL RETURN THE ITEMS AND COUNT OF THE ITEMS
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
