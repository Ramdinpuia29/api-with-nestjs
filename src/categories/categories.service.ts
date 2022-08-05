import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Category from './category.entity';
import CreateCategoryDto from './dto/createCategory.dto';
import UpdateCategoryDto from './dto/updateCategory.dto';
import CategoryNotFoundException from './exception/categoryNotFound.exception';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private categoriesRepository: Repository<Category>
    ) { }

    /**
     * @Function to get all the categories
     * @returns all categories in the database
     */
    getAllCategories() {
        return this.categoriesRepository.find({ relations: ['posts'] });
    }

    /**
     * @Function to get a category with id
     * @param id An id of a category. A category with this id should exist in the database
     * @returns the details of the category
     */
    async getCategoryById(id: number) {
        const category = await this.categoriesRepository.findOne({ where: { id }, relations: ['posts'] });
        if (category) {
            return category;
        }
        throw new CategoryNotFoundException(id);
    }

    /**
     * @Function to create a new category
     * @param category The data of a new category to be create
     * @returns the details of the created category
     */
    async createCategory(category: CreateCategoryDto) {
        const newCategory = this.categoriesRepository.create(category);
        await this.categoriesRepository.save(newCategory);
        return newCategory;
    }

    /**
     * @Function to update an existing category
     * @param id An id of a category. A category with this id should exist in the database
     * @param category The data of a category to be updated
     * @returns The details of the updated category
     */
    async updateCategory(id: number, category: UpdateCategoryDto) {
        await this.categoriesRepository.update(id, category);
        const updatedCategory = await this.categoriesRepository.findOne({ where: { id }, relations: ['posts'] });
        if (updatedCategory) {
            return updatedCategory;
        }
        throw new CategoryNotFoundException(id);
    }

    /**
     * @Function to delete an existing category
     * @param id An id of a category. A category with this id should exist in the database
     */
    async deleteCategory(id: number) {
        const deleteResponse = await this.categoriesRepository.delete(id);
        if (!deleteResponse.affected) {
            throw new CategoryNotFoundException(id);
        }
    }
}
