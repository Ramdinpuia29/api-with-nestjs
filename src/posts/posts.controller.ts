import { Body, ClassSerializerInterceptor, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import JwtAuthenticationGuard from 'src/authentication/jwt-authentication.guard';
import RequestWithUser from 'src/authentication/request-with-user.interface';
import FindOneParams from 'src/utils/find-one-params';
import { PaginationParams } from 'src/utils/types/pagination-params';
import CreatePostDto from './dto/create-post.dto';
import UpdatePostDto from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
@UseInterceptors(ClassSerializerInterceptor)
export class PostsController {
    constructor(
        private readonly postsService: PostsService
    ) { }

    @Get()
    async getPosts(
        @Query('search') search: string,
        @Query() { offset, limit, startId }: PaginationParams
    ) {
        if (search) {
            return this.postsService.searchForPosts(search, offset, limit);
        }
        return this.postsService.getAllPosts(offset, limit, startId);
    }

    @Get(':id')
    getPostById(@Param() { id }: FindOneParams) {
        return this.postsService.getPostById(Number(id));
    }

    @Post()
    @UseGuards(JwtAuthenticationGuard)
    async createPost(@Body() post: CreatePostDto, @Req() req: RequestWithUser) {
        return this.postsService.createPost(post, req.user);
    }

    @Patch(':id')
    async updatePost(@Param() { id }: FindOneParams, @Body() post: UpdatePostDto) {
        return this.postsService.updatePost(Number(id), post);
    }

    @Delete(':id')
    async deletePost(@Param() { id }: FindOneParams) {
        this.postsService.deletePost(Number(id));
    }
}
