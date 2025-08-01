import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

prisma.$queryRaw(`
    SELECT * FROM products
    WHERE price > 100
    ORDER BY price DESC
    LIMIT 10
    OFFSET 0
`);

async function createProduct(product) {
  const newProduct = await prisma.product.create({
    data: {
      name: product.name,
      description: product.description,
      price: product.price,
      images: {
        create: product.images.map((url) => ({ url })),
      },
    },
  });

  return newProduct;
}

async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  return product;
}

async function getAllProducts() {
  const products = await prisma.product.findMany();
  return products;
}

async function main() {
  const products = await getAllProducts();
  console.log(products);
}

main();

const user = await prisma.user.findFirst({
  select: {
    id: true,
    name: true,
    email: true,
    posts: {
      select: {
        id: true,
        title: true,
        content: true,
      },
    },
  },
});

/**
 * user : {
 *  id: 1,
 *  name: "John Doe",
 *  email: "john.doe@example.com",
 *  posts: {
 *    id: 1,
 *    title: "Post 1",
 *    content: "Content 1",
 *  }
 * }
 */
