import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/auth/public.decorator";
import { CategoriesService } from "./categories.service";

@Controller("catalog/categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  list() {
    return this.categories.listActive();
  }
}

