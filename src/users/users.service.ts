import { HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilesService } from 'src/files/files.service';
import { PrivateFilesService } from 'src/privateFiles/privateFiles.service';
import { Repository } from 'typeorm';
import CreateUserDto from './dto/createUser.dto';
import User from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private readonly filesService: FilesService,
        private readonly privateFilesService: PrivateFilesService
    ) { }

    /* 
    FUNCTION TO GET USER BY EMAIL
    */
    async getByEmail(email: string) {
        const user = await this.usersRepository.findOne({ where: { email } });
        if (user) {
            return user;
        }
        throw new HttpException('User with this email does not exist', HttpStatus.NOT_FOUND);
    }

    /* 
    FUNCTION TO GET USER BY ID
    */
    async getById(id: number) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (user) {
            return user;
        }
        throw new HttpException('User with this id does not exist', HttpStatus.NOT_FOUND);
    }

    /* 
    FUNCTION TO CREATE NEW USER
    */
    async create(userData: CreateUserDto) {
        const newUser = this.usersRepository.create(userData);
        await this.usersRepository.save(newUser);
        return newUser;
    }

    /* 
    FUNCTION TO ADD USER'S AVATAR
    */
    async addAvatar(userId: number, imageBuffer: Buffer, filename: string) {
        const user = await this.getById(userId);
        if (user.avatar) {
            await this.usersRepository.update(userId, {
                ...user,
                avatar: null
            });
            await this.filesService.deletePublicFile(user.avatar.id);
        }
        const avatar = await this.filesService.uploadPublicFile(imageBuffer, filename);
        await this.usersRepository.update(userId, {
            ...user,
            avatar
        });
        return avatar;
    };

    /* 
    FUNCTION TO DELETE USER'S AVATAR
    */
    async deleteAvatar(userId: number) {
        const user = await this.getById(userId);
        const fileId = user.avatar?.id;
        if (fileId) {
            await this.usersRepository.update(userId, {
                ...user,
                avatar: null
            });
            await this.filesService.deletePublicFile(fileId);
        }
    }

    /* 
    FUNCTION TO SET REFRESH TOKEN FOR LOGGED IN USER
    */
    async setCurrentRefreshToken(refreshToken: string, userId: number) {
        const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.usersRepository.update(userId, {
            currentHashedRefreshToken
        });
    }

    /* 
    FUNCTION TO MATCH USER'S REFRESH TOKEN WITH HASHED REFRESH TOKEN IN DB
    */
    async getUserIfRefreshTokenMatches(refreshToken: string, userId: number) {
        const user = await this.getById(userId);

        const isRefreshTokenMatching = await bcrypt.compare(refreshToken, user.currentHashedRefreshToken);

        if (isRefreshTokenMatching) {
            return user;
        }
    }

    /* 
    FUNCTION TO REMOVE REFRESH TOKEN WHEN USER IS LOGGING OUT
    */
    async removeRefreshToken(userId: number) {
        return this.usersRepository.update(userId, {
            currentHashedRefreshToken: null
        });
    }

    /* 
    FUNCTION TO ADD USER'S PRIVATE FILES
    */
    async addPrivateFile(userId: number, imageBuffer: Buffer, filename: string) {
        return this.privateFilesService.uploadPrivateFile(imageBuffer, userId, filename);
    }

    /* 
    FUNCTION TO GET USER'S PRIVATE FILES
    */
    async getPrivateFile(userId: number, fileId: number) {
        const file = await this.privateFilesService.getPrivateFile(fileId);
        if (file.info.owner.id === userId) {
            return file;
        }
        throw new UnauthorizedException();
    }

    /* 
    FUNCTION TO GET ALL USER'S PRIVATE FILES
    */
    async getAllPrivateFiles(userId: number) {
        const userWithFiles = await this.usersRepository.findOne({ where: { id: userId }, relations: ['files'] });
        if (userWithFiles) {
            return Promise.all(
                userWithFiles.files.map(async (file) => {
                    const url = await this.privateFilesService.generatePresignedUrl(file.key);
                    return {
                        ...file,
                        url
                    };
                })
            );
        }
        throw new NotFoundException('User with this id does not exist');
    }


}
