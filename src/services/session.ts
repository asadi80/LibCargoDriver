import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";
const USER_KEY  = "auth_user";

export const saveSession = async (token: string, user: object) => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
};

export const getSession = async () => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const raw   = await SecureStore.getItemAsync(USER_KEY);
  if (!token || !raw) return null;
  return { token, user: JSON.parse(raw) };
};

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export const getDriver = async () => {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
};

export const removeSession = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
};