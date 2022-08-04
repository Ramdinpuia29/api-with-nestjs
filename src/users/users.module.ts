import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesModule } from 'src/files/files.module';
import Address from './address.entity';
import User from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrivateFilesModule } from 'src/privateFiles/privateFiles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Address]),
    FilesModule,
    PrivateFilesModule
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule { }
