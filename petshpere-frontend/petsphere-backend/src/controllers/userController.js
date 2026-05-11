const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function syncUser(req, res) {
  try {
    const { id, email, name } = req.body;

    if (!id || !email) {
      return res.status(400).json({ error: "id and email are required." });
    }

    const displayName =
      typeof name === "string" && name.trim().length > 0
        ? name.trim()
        : "PetSphere User";

    const user = await prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        email,
        name: displayName,
      },
    });

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to sync user.",
      details: error.message,
    });
  }
}

module.exports = {
  syncUser,
};
