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
    bio: string;
    photoLink: string;
    principal: Principal;
    displayName: string;
    interests: Array<Interest>;
    isActive: boolean;
    genderPreference: Gender;
    gender: Gender;
    lastActive: bigint;
}
export interface Post {
    id: bigint;
    author: Principal;
    blobId: string;
    caption: string;
    timestamp: bigint;
    likes: Array<Principal>;
    commentCount: bigint;
}
export interface Reel {
    id: bigint;
    author: Principal;
    blobId: string;
    caption: string;
    timestamp: bigint;
    likes: Array<Principal>;
    commentCount: bigint;
}
export interface Story {
    id: bigint;
    author: Principal;
    blobId: string;
    timestamp: bigint;
}
export interface Comment {
    id: bigint;
    contentId: bigint;
    author: Principal;
    text: string;
    timestamp: bigint;
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
export enum Variant_ok_alreadyRegistered_usernameTaken {
    ok = "ok",
    alreadyRegistered = "alreadyRegistered",
    usernameTaken = "usernameTaken"
}
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
    getMyProfile(): Promise<Profile | null>;
    getMyUsername(): Promise<string | null>;
    getNotifications(): Promise<Array<Notification>>;
    getUnreadNotificationCount(): Promise<bigint>;
    getUserCount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<Profile>;
    getWhoILiked(): Promise<Array<Principal>>;
    getWhoLikedMe(): Promise<Array<Principal>>;
    hasCompletedOnboarding(): Promise<boolean>;
    isAdmin(): Promise<boolean>;
    isAuthenticated(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isUsernameAvailable(username: string): Promise<boolean>;
    likeUser(likedUserId: Principal): Promise<void>;
    loginWithCredentials(username: string, passwordHash: string): Promise<boolean>;
    markNotificationAsRead(_timestamp: bigint): Promise<void>;
    registerWithCredentials(username: string, passwordHash: string): Promise<Variant_ok_alreadyRegistered_usernameTaken>;
    saveCallerUserProfile(profile: Profile): Promise<void>;
    saveCallerUserProfileInfo(profileInfo: InterestDisplayPrefs): Promise<void>;
    sendMessage(recipient: Principal, content: string): Promise<void>;
    setOffline(): Promise<void>;
    setOnline(): Promise<void>;
    unfollowUser(unfollowedUserId: Principal): Promise<void>;
    unlikeUser(_unlikedUserId: Principal): Promise<void>;
    // Posts
    createPost(blobId: string, caption: string): Promise<bigint>;
    getAllPosts(): Promise<Array<Post>>;
    getPostsByUser(user: Principal): Promise<Array<Post>>;
    likePost(postId: bigint): Promise<void>;
    unlikePost(postId: bigint): Promise<void>;
    commentOnPost(postId: bigint, text: string): Promise<bigint>;
    getPostComments(postId: bigint): Promise<Array<Comment>>;
    deletePost(postId: bigint): Promise<void>;
    // Reels
    createReel(blobId: string, caption: string): Promise<bigint>;
    getAllReels(): Promise<Array<Reel>>;
    getReelsByUser(user: Principal): Promise<Array<Reel>>;
    likeReel(reelId: bigint): Promise<void>;
    unlikeReel(reelId: bigint): Promise<void>;
    commentOnReel(reelId: bigint, text: string): Promise<bigint>;
    getReelComments(reelId: bigint): Promise<Array<Comment>>;
    deleteReel(reelId: bigint): Promise<void>;
    // Stories
    createStory(blobId: string): Promise<bigint>;
    getActiveStories(): Promise<Array<Story>>;
    deleteExpiredStories(): Promise<void>;
}
