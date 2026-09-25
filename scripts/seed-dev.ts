import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("🌱 Seeding HookForge development data...");

    const organization = await prisma.organization.upsert({
        where: {
            id: "00000000-0000-0000-0000-000000000001",
        },
        update: {
            name: "HookForge Demo Organization",
        },
        create: {
            id: "00000000-0000-0000-0000-000000000001",
            name: "HookForge Demo Organization",
        },
    });

    console.log("Organization:", organization.id);

    const endpointA = await prisma.endpoint.upsert({
        where: {
            id: "00000000-0000-0000-0000-000000000101",
        },
        update: {
            name: "Demo Receiver A",
            url: "http://localhost:4000/webhooks/a",
            signingSecret: "dev-secret-a",
            isActive: true,
        },
        create: {
            id: "00000000-0000-0000-0000-000000000101",
            organizationId: organization.id,
            name: "Demo Receiver A",
            url: "http://localhost:4000/webhooks/a",
            signingSecret: "dev-secret-a",
            isActive: true,
        },
    });

    const endpointB = await prisma.endpoint.upsert({
        where: {
            id: "00000000-0000-0000-0000-000000000102",
        },
        update: {
            name: "Demo Receiver B",
            url: "http://localhost:4000/webhooks/b",
            signingSecret: "dev-secret-b",
            isActive: true,
        },
        create: {
            id: "00000000-0000-0000-0000-000000000102",
            organizationId: organization.id,
            name: "Demo Receiver B",
            url: "http://localhost:4000/webhooks/b",
            signingSecret: "dev-secret-b",
            isActive: true,
        },
    });

    console.log("Endpoint A:", endpointA.id);
    console.log("Endpoint B:", endpointB.id);

    console.log("✅ Development seed completed");
}

main()
    .catch((error) => {
        console.error("❌ Seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });