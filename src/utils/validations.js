function isValidEmail(email) {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return emailRegex.test(String(email).toLowerCase());
}

function isValidName(name) {
    return typeof name === 'string' && name.trim().length >= 3;
}

function isUniqueNumericId(id, users) {
    return typeof id === 'number' && !users.some(user => user.id === id);
}

function validatePassword(password) {
    // mínima longitud 8; puedes extender la validación si quieres complejidad
    return typeof password === 'string' && password.length >= 8;
}

function validateUser(user, users) {
    const { name, email, id } = user;
    if (!isValidName(name)) {
        return {
            isValid: false,
            error: 'El nombre debe tener al menos 3 caracteres.'
        };
    }
    if (!isValidEmail(email)) {
        return { isValid: false, error: 'El correo electronico no es valido.' };
    }
    if (!isUniqueNumericId(id, users)) {
        return { isValid: false, error: 'El ID debe ser numerico y unico.' };
    }
    return { isValid: true };
}

module.exports = {
    validateEmail: isValidEmail,
    validateName: isValidName,
    validatePassword,
    isValidEmail,
    isValidName,
    isUniqueNumericId,
    validateUser
};