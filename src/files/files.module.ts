import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import PrivateFile from 'src/files/entities/private-file.entity';
import { FilesService } from './files.service';
import PublicFile from './entities/public-file.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublicFile, PrivateFile]),
    ConfigModule
  ],
  providers: [FilesService],
  exports: [FilesService]
})
export class FilesModule { }
