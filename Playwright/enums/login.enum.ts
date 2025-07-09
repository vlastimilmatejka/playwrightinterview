interface userAccount {
    email: string;
    password: string;
}

export const notRegisteredAccount: userAccount = {
    email: "fdsafsdafdsf@dsfdsfds.com",
    password: "12345678",
}

export const validAccount: userAccount = {
    email: "test01@test.cz",
    password: "12345678",
}

export const validEmailInvalidPassword: userAccount = {
    email: "test01@test.cz",
    password: "1234",
}