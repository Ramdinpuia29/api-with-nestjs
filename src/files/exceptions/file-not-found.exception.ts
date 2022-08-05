import { NotFoundException } from "@nestjs/common";

export class FileNotFoundException extends NotFoundException {
    constructor(fileId: number) {
        super(`File with id ${fileId} does not exist`);
    }
}