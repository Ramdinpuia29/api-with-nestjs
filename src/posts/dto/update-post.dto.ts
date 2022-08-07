import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

class UpdatePostDto {
    @IsNumber()
    @IsOptional()
    id: number;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    paragrapsh: string[];

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    title: string;
}

export default UpdatePostDto;