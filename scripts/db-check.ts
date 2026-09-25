import { prisma } from "../src/lib/prisma";

async function main() {
    const organization = await prisma.organization.create({
        data: {
            name: "HookForge Demo",
        },
    });

    console.log("Created Organization", organization);

    const found = await prisma.organization.findUnique({
        where: {
            id: organization.id,
        },
    });

    console.log("Fetched orga")
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })

    .finally(async () => {
        await prisma.$disconnect();
    });