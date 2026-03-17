import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Reel {
    id: bigint;
    author: Principal;
    likes: Array<Principal>;
    timestamp: bigint;
    caption: string;
    blobId: string;
    commentCount: bigint;
}
export interface Comment {
    id: bigint;
    contentId: bigint;
    text: string;
    author: Principal;
    timestamp: bigint;
}
export interface Story {
    id: bigint;
    author: Principal;
    timestamp: bigint;
    blobId: string;
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
export interface SearchResult {
    principal: Principal;
    displayName: string;
    photoLink: string;
    username: string;
}
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
export interface Post {
    id: bigint;
    author: Principal;
    likes: Array<Principal>;
    timestamp: bigint;
    caption: string;
    blobId: string;
    commentCount: bigint;
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
export interface PasswordResetRequestInfo {
    username: string;
    requestTime: bigint;
}
export enum FollowRequestStatus {
    pending = "pending",
    accepted = "accepted",
    declined = "declined"
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
    acceptFollowRequest(requester: Principal): Promise<void>;
    adminResetPassword(username: string, newPasswordHash: string): Promise<boolean>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    commentOnPost(postId: bigint, text: string): Promise<bigint>;
    commentOnReel(reelId: bigint, text: string): Promise<bigint>;
    createPost(blobId: string, caption: string): Promise<bigint>;
    createReel(blobId: string, caption: string): Promise<bigint>;
    createStory(blobId: string): Promise<bigint>;
    declineFollowRequest(requester: Principal): Promise<void>;
    deleteExpiredStories(): Promise<void>;
    deletePost(postId: bigint): Promise<void>;
    deleteReel(reelId: bigint): Promise<void>;
    fillSampleData(): Promise<void>;
    followUser(followedUserId: Principal): Promise<void>;
    getActiveStories(): Promise<Array<Story>>;
    getAllConversations(): Promise<Array<[Principal, Array<Message>]>>;
    getAllPosts(): Promise<Array<Post>>;
    getAllProfiles(): Promise<Array<Profile>>;
    searchUsers(query: string): Promise<Array<SearchResult>>;
    getAllReels(): Promise<Array<Reel>>;
    getCallerUserProfile(): Promise<Profile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getConversationsWithUser(otherUser: Principal): Promise<Array<Message>>;
    getFollowRequestStatus(targetUser: Principal): Promise<FollowRequestStatus | null>;
    getFollowerCount(): Promise<bigint>;
    getFollowers(): Promise<Array<Principal>>;
    getFollowing(): Promise<Array<Principal>>;
    getFollowingCount(): Promise<bigint>;
    getMyProfile(): Promise<Profile | null>;
    getMyUsername(): Promise<string | null>;
    getNotifications(): Promise<Array<Notification>>;
    getPendingFollowRequests(): Promise<Array<Principal>>;
    getPendingPasswordResetRequests(): Promise<Array<PasswordResetRequestInfo>>;
    getPostComments(postId: bigint): Promise<Array<Comment>>;
    getPostsByUser(user: Principal): Promise<Array<Post>>;
    getReelComments(reelId: bigint): Promise<Array<Comment>>;
    getReelsByUser(user: Principal): Promise<Array<Reel>>;
    getSecurityQuestion(username: string): Promise<string | null>;
    getUnreadNotificationCount(): Promise<bigint>;
    getUserCount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<Profile>;
    getUsernameByPrincipal(user: Principal): Promise<string | null>;
    getWhoILiked(): Promise<Array<Principal>>;
    getWhoLikedMe(): Promise<Array<Principal>>;
    hasCompletedOnboarding(): Promise<boolean>;
    isAdmin(): Promise<boolean>;
    isAuthenticated(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isFollowing(user: Principal): Promise<boolean>;
    isUsernameAvailable(username: string): Promise<boolean>;
    likePost(postId: bigint): Promise<void>;
    likeReel(reelId: bigint): Promise<void>;
    likeUser(likedUserId: Principal): Promise<void>;
    loginWithCredentials(username: string, passwordHash: string): Promise<boolean>;
    markNotificationAsRead(_timestamp: bigint): Promise<void>;
    registerWithCredentials(username: string, passwordHash: string): Promise<Variant_ok_alreadyRegistered_usernameTaken>;
    requestAdminPasswordReset(username: string): Promise<void>;
    resetPasswordWithOtp(username: string, otp: string, newPasswordHash: string): Promise<boolean>;
    saveCallerUserProfile(profile: Profile): Promise<void>;
    saveCallerUserProfileInfo(profileInfo: InterestDisplayPrefs): Promise<void>;
    sendFollowRequest(targetUser: Principal): Promise<void>;
    sendMessage(recipient: Principal, content: string): Promise<void>;
    setOffline(): Promise<void>;
    setOnline(): Promise<void>;
    setSecurityQuestion(question: string, answerHash: string): Promise<void>;
    unfollowUser(unfollowedUserId: Principal): Promise<void>;
    unlikePost(postId: bigint): Promise<void>;
    unlikeReel(reelId: bigint): Promise<void>;
    unlikeUser(_unlikedUserId: Principal): Promise<void>;
    verifySecurityAnswer(username: string, answerHash: string): Promise<string | null>;
}
