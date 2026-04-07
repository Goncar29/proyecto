const bcrypt = require('bcryptjs');
const prisma = require('../../src/utils/prismaClient');

const TEST_PASSWORD = 'password123';

const TEST_USERS = {
    patient: { email: 'test_patient@test.com', name: 'Test Patient', role: 'PATIENT' },
    doctor:  { email: 'test_doctor@test.com',  name: 'Test Doctor',  role: 'DOCTOR'  },
    admin:   { email: 'test_admin@test.com',   name: 'Test Admin',   role: 'ADMIN'   },
};

const createTestUsers = async () => {
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    const users = {};
    for (const [key, data] of Object.entries(TEST_USERS)) {
        users[key] = await prisma.user.upsert({
            where: { email: data.email },
            update: {},
            create: { ...data, password: hashedPassword },
        });
    }
    return users;
};

const deleteTestUsers = async () => {
    const emails = Object.values(TEST_USERS).map(u => u.email);
    const users = await prisma.user.findMany({ where: { email: { in: emails } } });
    const ids = users.map(u => u.id);

    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
};

module.exports = { createTestUsers, deleteTestUsers, TEST_PASSWORD, TEST_USERS };
