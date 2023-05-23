export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
}

export interface Address {
  city: string;
  street: string;
}

/**
 * Open KV.
 */

const kv = await Deno.openKv();

/**
 * Upsert user.
 * @param user
 */

export async function upsertUser(user: User) {
  const primary = ["user", user.id];
  const secondary = ["user_by_email", user.email];

  const [userRes, userFromEmailRes] = await kv.getMany([primary, secondary]);

  await kv.atomic()
    .check(userRes)
    .check(userFromEmailRes)
    .set(primary, user)
    .set(secondary, user)
    .commit();
}

/**
 * Update user and address.
 * @param user
 * @param address
 */

export async function updateUserAndAddress(user: User, address: Address) {
  const userKey = ["user", user.id];
  const userByEmailKey = ["user_by_email", user.email];
  const addressKey = ["user_address", user.id];

  const [userRes, userFromEmailRes, addressRes] = await kv.getMany([
    userKey,
    userByEmailKey,
    addressKey,
  ]);

  await kv.atomic()
    .check(userRes)
    .check(userFromEmailRes)
    .check(addressRes)
    .set(userKey, user)
    .set(userByEmailKey, user)
    .set(addressKey, address)
    .commit();
}

/**
 * Get all users with pagination.
 * @returns <User>
 */

export async function getAllUsers() {
  let iter = await kv.list<User>({ prefix: ["user"] });
  const users = [];
  for await (const res of iter) users.push(res.value);
  while (iter.cursor) {
    iter = await kv.list<User>({ prefix: ["user"] }, { cursor: iter.cursor });
    for await (const res of iter) users.push(res.value);
  }
  return users;
}

/**
 * Get user by id.
 * @param id
 * @returns
 */

export async function getUserById(id: string): Promise<User> {
  const key = ["user", id];
  return (await kv.get(key)).value as User;
}

/**
 * Get user by email.
 * @param email
 * @returns
 */

export async function getUserByEmail(email: string) {
  const key = ["user_by_email", email];
  return (await kv.get(key)).value as User;
}

/**
 * Get address by user id.
 * @param id
 * @returns Address
 */

export async function getAddressByUserId(id: string) {
  const key = ["user_address", id];
  return (await kv.get(key)).value as Address;
}

/**
 * Delete user by id.
 * @param id
 */

export async function deleteUserById(id: string) {
  const userKey = ["user", id];
  const userRes = await kv.get(userKey);
  const userByEmailKey = ["user_by_email", userRes.value.email];
  const addressKey = ["user_address", id];

  const [userFromEmailRes, addressRes] = await kv.getMany([
    userByEmailKey,
    addressKey,
  ]);

  await kv.atomic()
    .check(userRes)
    .check(userFromEmailRes)
    .check(addressRes)
    .delete(userKey)
    .delete(userByEmailKey)
    .delete(addressKey)
    .commit();
}