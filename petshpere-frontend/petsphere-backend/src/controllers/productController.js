const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * GET /api/v1/products
 * Returns all products. Accepts an optional `category` query param to filter.
 * Pass `category=Fresh Food` for the fresh food catalog,
 * or `category=Toys` / `category=Accessories` / `category=Packaged Food` for the pet store.
 * Omitting the param returns every product (used by checkout summary, etc.)
 */
async function getProducts(req, res) {
  try {
    const { category, excludeCategory } = req.query;

    let where = { inStock: true };
    if (category) {
      where.category = category;
    } else if (excludeCategory) {
      where.category = { not: excludeCategory };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ products });
  } catch (error) {
    console.error("[productController] getProducts error:", error);
    return res.status(500).json({
      error: "Failed to fetch products.",
      details: error.message,
    });
  }
}

/**
 * GET /api/v1/products/:id — fetch single product by UUID
 */
async function getProductById(req, res) {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    return res.status(200).json({ product });
  } catch (error) {
    console.error("[productController] getProductById error:", error);
    return res.status(500).json({
      error: "Failed to fetch product.",
      details: error.message,
    });
  }
}

module.exports = { getProducts, getProductById };
