import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchModule } from 'src/search/search.module';
import Post from './post.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import PostsSearchService from './posts-search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    SearchModule
  ],
  controllers: [PostsController],
  providers: [PostsService, PostsSearchService]
})
export class PostsModule { }
