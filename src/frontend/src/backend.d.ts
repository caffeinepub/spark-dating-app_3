import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface VisibleInterest {
}
export interface InterestDisplayPrefs {
    skipGender: boolean;
    showGender: boolean;
    showInterests: boolean;
    visibleInterests: Array<VisibleInterest>;
    showAge: boolean;
    genderPreference: Gender;
}
export interface Notification {
    to: Principal;
    isRead: boolean;
    message: string;
    timestamp: bigint;
}
export interface Message {
    to: Principal;
    content: string;
    from: Principal;
    isRead: boolean;
    timestamp: bigint;
}
export interface Interest {
    id: bigint;
    name: string;
}
export interface Profile {
    id: bigint;
    photoLink: string;
    principal: Principal;
    displayName: string;
    interests: Array<Interest>;
    isActive: boolean;
    genderPreference: Gender;
    gender: Gender;
    lastActive: bigint;
}
export enum Gender {
    other = "other",
    female = "female",
    male = "male"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export type RegisterResult =
    | { ok: null }
    | { usernameTaken: null }
    | { alreadyRegistered: null };
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    fillSampleData(): Promise<void>;
    followUser(followedUserId: Principal): Promise<void>;
    getAllConversations(): Promise<Array<[Principal, Array<Message>]>>;
    getAllProfiles(): Promise<Array<Profile>>;
    getCallerUserRole(): Promise<UserRole>;
    getConversationsWithUser(otherUser: Principal): Promise<Array<Message>>;
    getFollowers(): Promise<Array<Principal>>;
    getFollowing(): Promise<Array<Principal>>;
    getNotifications(): Promise<Array<Notification>>;
    getUnreadNotificationCount(): Promise<bigint>;
    getUserCount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<Profile>;
    getWhoILiked(): Promise<Array<Principal>>;
    getWhoLikedMe(): Promise<Array<Principal>>;
    isAdmin(): Promise<boolean>;
    isAuthenticated(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    likeUser(likedUserId: Principal): Promise<void>;
    markNotificationAsRead(_timestamp: bigint): Promise<void>;
    saveCallerUserProfile(profile: Profile): Promise<void>;
    saveCallerUserProfileInfo(profileInfo: InterestDisplayPrefs): Promise<void>;
    sendMessage(recipient: Principal, content: string): Promise<void>;
    setOffline(): Promise<void>;
    setOnline(): Promise<void>;
    unfollowUser(unfollowedUserId: Principal): Promise<void>;
    unlikeUser(_unlikedUserId: Principal): Promise<void>;
    // Credential-based auth
    registerWithCredentials(username: string, passwordHash: string): Promise<RegisterResult>;
    loginWithCredentials(username: string, passwordHash: string): Promise<boolean>;
    isUsernameAvailable(username: string): Promise<boolean>;
    getMyProfile(): Promise<Profile | null>;
    hasCompletedOnboarding(): Promise<boolean>;
    getMyUsername(): Promise<string | null>;
}
