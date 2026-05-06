const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function getPetsByUser(req, res) {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized request." });
    }

    const pets = await prisma.pet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ pets });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch pets.",
      details: error.message,
    });
  }
}

async function addPet(req, res) {
  try {
    const userId = req.userId;
    const { name, breed, age, weight } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized request." });
    }

    if (!name || !breed || age === undefined || weight === undefined) {
      return res.status(400).json({ error: "name, breed, age, and weight are required." });
    }

    const pet = await prisma.pet.create({
      data: {
        name: String(name).trim(),
        breed: String(breed).trim(),
        age: Number(age),
        weight: Number(weight),
        userId,
      },
    });

    return res.status(201).json({ pet });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to add pet.",
      details: error.message,
    });
  }
}

async function updatePet(req, res) {
  try {
    const userId = req.userId;
    const { petId } = req.params;
    const { name, breed, age, weight } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized request." });
    }

    const existingPet = await prisma.pet.findUnique({
      where: { id: petId },
    });

    if (!existingPet || existingPet.userId !== userId) {
      return res.status(404).json({ error: "Pet not found." });
    }

    const updatedPet = await prisma.pet.update({
      where: { id: petId },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(breed !== undefined ? { breed: String(breed).trim() } : {}),
        ...(age !== undefined ? { age: Number(age) } : {}),
        ...(weight !== undefined ? { weight: Number(weight) } : {}),
      },
    });

    return res.status(200).json({ pet: updatedPet });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to update pet.",
      details: error.message,
    });
  }
}

async function deletePet(req, res) {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized request." });
    }

    console.log("Backend deleting pet:", id, "for user:", userId);

    const { count } = await prisma.pet.deleteMany({
      where: { id: id, userId: userId },
    });

    if (count === 0) {
      return res.status(404).json({ error: "Pet not found or unauthorized." });
    }

    return res.status(200).json({ message: "Pet deleted successfully." });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to delete pet.",
      details: error.message,
    });
  }
}

module.exports = {
  getPetsByUser,
  addPet,
  updatePet,
  deletePet,
};
