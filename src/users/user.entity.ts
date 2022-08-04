import { Exclude } from "class-transformer";
import Post from "../posts/post.entity";
import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import Address from "./address.entity";
import PublicFile from "src/files/publicFile.entity";
import PrivateFile from "src/privateFiles/privateFile.entity";

@Entity()
class User {
    @PrimaryGeneratedColumn()
    public id?: number;

    @Column({ unique: true })
    public email: string;

    @Column()
    public name: string;

    @Column()
    @Exclude()
    public password: string;

    @OneToOne(() => Address, {
        eager: true,
        cascade: true
    })
    @JoinColumn()
    public address: Address;

    @OneToMany(() => Post, (post: Post) => post.author)
    public posts?: Post[];

    @JoinColumn()
    @OneToOne(() => PublicFile, { eager: true, nullable: true })
    public avatar?: PublicFile;

    @OneToMany(() => PrivateFile, (file: PrivateFile) => file.owner)
    public files?: PrivateFile[];
}

export default User;