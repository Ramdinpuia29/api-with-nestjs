import { HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilesService } from 'src/files/files.service';
import { DataSource, Repository } from 'typeorm';
import CreateUserDto from './dto/createUser.dto';
import User from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private readonly filesService: FilesService,
        private dataSource: DataSource,
    ) { }

    /**
     * @Function to get the details of a user using email
     * @param email An email of a user. A user with this email should exist in the database
     * @returns The details of the user with the email
     */
    async getByEmail(email: string) {
        const user = await this.usersRepository.findOne({ where: { email } });
        if (user) {
            return user;
        }
        throw new HttpException('User with this email does not exist', HttpStatus.NOT_FOUND);
    }

    /**
     * @Function to get the details of a user using id
     * @param id An id of a user. A user with this id should exist in the database
     * @returns The details of the user with the id
     */
    async getById(id: number) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (user) {
            return user;
        }
        throw new HttpException('User with this id does not exist', HttpStatus.NOT_FOUND);
    }

    /**
     * @Function to create a new user
     * @param userData The data of a user to be created.
     * @returns The details of the created user
     */
    async create(userData: CreateUserDto) {
        const newUser = this.usersRepository.create(userData);
        await this.usersRepository.save(newUser);
        return newUser;
    }

    /**
     * @Function to add an avatar of a user
     * @param userId An id of a user. A user with this id should exist in the database
     * @param imageBuffer The buffer data of the image
     * @param filename A file name
     * @returns The details of the avatar
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

    /**
     * @Function to delete the avatar of a user
     * @param userId An id of a user. A user with this id should exist in the database
     */
    async deleteAvatar(userId: number) {
        const queryRunner = this.dataSource.createQueryRunner();

        const user = await this.getById(userId);
        const fileId = user.avatar?.id;
        if (fileId) {
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
                await queryRunner.manager.update(User, userId, {
                    ...user,
                    avatar: null
                });
                await this.filesService.deletePublicFileWithQueryRunner(fileId, queryRunner);
                await queryRunner.commitTransaction();
            } catch (error) {
                await queryRunner.rollbackTransaction();
                throw new InternalServerErrorException();
            } finally {
                await queryRunner.release();
            }
        }
    }

    /**
     * @Function to update the refresh token of a user with the id
     * @param refreshToken The existing refresh token of a user in the database
     * @param userId An id of a user. A user with this id should exist in the database
     */
    async setCurrentRefreshToken(refreshToken: string, userId: number) {
        const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.usersRepository.update(userId, {
            currentHashedRefreshToken
        });
    }

    /**
     * @Function to get user if the given refresh token matches with the hashed refresh token in the database
     * @param refreshToken The plain refresh token of a user in the database
     * @param userId An id of a user. A user with this id should exist in the database
     * @returns The details of the user with the id.
     */
    async getUserIfRefreshTokenMatches(refreshToken: string, userId: number) {
        const user = await this.getById(userId);

        const isRefreshTokenMatching = await bcrypt.compare(refreshToken, user.currentHashedRefreshToken);

        if (isRefreshTokenMatching) {
            return user;
        }
    }

    /**
     * @Function to remove refresh token of a user when logging out
     * @param userId An id of a user. A user with this id should exist in the database.
     * @returns the details of the user with empty refresh token
     */
    async removeRefreshToken(userId: number) {
        return this.usersRepository.update(userId, {
            currentHashedRefreshToken: null
        });
    }

    /**
     * @Function to add a private file to AWS Bucket
     * @param userId An id of a user. A user with this id should exist in the database
     * @param imageBuffer A buffer data of the image to be uploaded
     * @param filename A file name
     * @returns A promise with the public version of the uploaded file
     */
    async addPrivateFile(userId: number, imageBuffer: Buffer, filename: string) {
        return this.filesService.uploadPrivateFile(imageBuffer, userId, filename);
    }

    /**
     * @Function to get a private file from AWS Bucket
     * @param userId An id of a user. A user with this id should exist in the database
     * @param fileId An id of a file. A file with this id should exist in the database
     * @returns The details of the file with the id
     */
    async getPrivateFile(userId: number, fileId: number) {
        const file = await this.filesService.getPrivateFile(fileId);
        if (file.info.owner.id === userId) {
            return file;
        }
        throw new UnauthorizedException();
    }

    /**
     * @Function to get all the private file of a user from AWS Bucket
     * @param userId An id of a user. A user with this id should exist in the database
     * @returns All the private file of the user with the id.
     */
    async getAllPrivateFiles(userId: number) {
        const userWithFiles = await this.usersRepository.findOne({ where: { id: userId }, relations: ['files'] });
        if (userWithFiles) {
            return Promise.all(
                userWithFiles.files.map(async (file) => {
                    const url = await this.filesService.generatePresignedUrl(file.key);
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
