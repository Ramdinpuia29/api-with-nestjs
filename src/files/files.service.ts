import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { S3 } from 'aws-sdk';
import { QueryRunner, Repository } from 'typeorm';
import PublicFile from './entities/public-file.entity';
import { v4 as uuid } from "uuid";
import PrivateFile from 'src/files/entities/private-file.entity';
import { FileNotFoundException } from './exceptions/file-not-found.exception';

@Injectable()
export class FilesService {
    constructor(
        @InjectRepository(PublicFile)
        private publicFilesRepository: Repository<PublicFile>,
        @InjectRepository(PrivateFile)
        private privateFilesRepository: Repository<PrivateFile>,
        private readonly configService: ConfigService
    ) { }

    /**
     * @Function to upload public file to AWS Bucket
     * @param dataBuffer The file buffer of the uploaded content
     * @param filename A file name
     * @returns A promise with the public version of the uploaded file
    */
    async uploadPublicFile(dataBuffer: Buffer, filename: string) {
        const s3 = new S3();
        const uploadResult = await s3.upload({
            Bucket: this.configService.get('AWS_PUBLIC_BUCKET_NAME'),
            Body: dataBuffer,
            Key: `${uuid()}-${filename}`
        }).promise();

        const newFile = this.publicFilesRepository.create({
            key: uploadResult.Key,
            url: uploadResult.Location
        });
        await this.publicFilesRepository.save(newFile);
        return newFile;
    };

    /**
     * @Function to delete public file from AWS Bucket without QueryRunner
     * @param fileId An id of the file. A file with this id should exist in the database
     */
    async deletePublicFile(fileId: number) {
        const file = await this.publicFilesRepository.findOne({ where: { id: fileId } });
        const s3 = new S3();
        await s3.deleteObject({
            Bucket: this.configService.get('AWS_PUBLIC_BUCKET_NAME'),
            Key: file.key
        }).promise();
        await this.publicFilesRepository.delete(fileId);
    }

    /**
    * @Function to delete public file with QueryRunner from AWS Bucket
    * @param fileId An id of the file. A file with this id should exist in the database
    * @param queryRunner A QueryRunner instance from TypeOrm
    */
    async deletePublicFileWithQueryRunner(fileId: number, queryRunner: QueryRunner) {
        const file = await queryRunner.manager.findOne(PublicFile, { where: { id: fileId } });
        const s3 = new S3();
        await s3.deleteObject({
            Bucket: this.configService.get('AWS_PUBLIC_BUCKET_NAME'),
            Key: file.key
        }).promise();
        await this.publicFilesRepository.delete(fileId);
    }

    /**
     * @Function to generate file url from AWS Bucket
     * @param key AWS object key
     * @returns A promise with an url
     */
    public async generatePresignedUrl(key: string) {
        const s3 = new S3();

        return s3.getSignedUrlPromise('getObject', {
            Bucket: this.configService.get('AWS_PRIVATE_BUCKET_NAME'),
            Key: key
        });
    }

    /**
     * @Function to get private file from AWS Bucket
     * @param fileId An id of a file. A file with this id should exist in the database
     * @returns A promise with the file and its information
     */
    public async getPrivateFile(fileId: number) {
        const s3 = new S3();
        const fileInfo = await this.privateFilesRepository.findOne({ where: { id: fileId }, relations: ['owner'] });

        if (fileInfo) {
            const stream = await s3.getObject({
                Bucket: this.configService.get('AWS_PRIVATE_BUCKET_NAME'),
                Key: fileInfo.key
            }).createReadStream();
            return {
                stream,
                info: fileInfo
            };
        }
        throw new FileNotFoundException(fileId);
    }

    /**
     * @Function to upload private file to AWS Bucket
     * @param dataBuffer The file buffer of the uploaded content
     * @param ownerId The id of the user who uploaded the file. A user with this id should exist in the database
     * @param filename A file name
     * @returns A promise with the public version of the uploaded file
     */
    async uploadPrivateFile(dataBuffer: Buffer, ownerId: number, filename: string) {
        const s3 = new S3();
        const uploadResult = await s3.upload({
            Bucket: this.configService.get('AWS_PRIVATE_BUCKET_NAME'),
            Body: dataBuffer,
            Key: `${uuid()}-${filename}`
        }).promise();

        const newFile = this.privateFilesRepository.create({
            key: uploadResult.Key,
            owner: {
                id: ownerId
            }
        });
        await this.privateFilesRepository.save(newFile);
        return newFile;
    }

    /**
     * @Function to delete private file from AWS Bucket
     * @param fileId An id of a file. A file with this id should exist in the database
     * @param ownerId AN id of the user who uploaded the file. A user with this id should exist in the database
     */
    async deletePrivateFile(fileId: number, ownerId: number) {
        const s3 = new S3();
        const file = await this.privateFilesRepository.findOne({
            where: {
                id: fileId
            },
            relations: ['owner']
        });
        if (file) {
            if (file.owner && file.owner.id === ownerId) {
                await s3.deleteObject({
                    Bucket: this.configService.get('AWS_PRIVATE_BUCKET_NAME'),
                    Key: file.key
                }).promise();
                await this.privateFilesRepository.delete(fileId);
            } else {
                throw new UnauthorizedException();
            }
        } else {
            throw new FileNotFoundException(fileId);
        }
    }
}
