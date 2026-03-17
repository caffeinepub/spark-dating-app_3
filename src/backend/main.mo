import List "mo:core/List";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";

actor {
  // State
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  include MixinStorage();

  module UserProfile {
    public type Gender = {
      #male;
      #female;
      #other;
    };
    public type Id = Nat;

    public type VisibleInterest = {};

    public type Interest = {
      id : Nat;
      name : Text;
    };

    public type InterestDisplayPrefs = {
      showGender : Bool;
      showAge : Bool;
      showInterests : Bool;
      visibleInterests : [VisibleInterest];
      skipGender : Bool;
      genderPreference : Gender;
    };

    public type Profile = {
      id : Nat;
      principal : Principal;
      displayName : Text;
      bio : Text;
      lastActive : Int;
      photoLink : Text;
      isActive : Bool;
      gender : Gender;
      genderPreference : Gender;
      interests : [Interest];
    };
  };

  type Like = {
    from : Principal;
    to : Principal;
    timestamp : Int;
  };

  type FollowRequestStatus = {
    #pending;
    #accepted;
    #declined;
  };

  type FollowRequest = {
    requester : Principal;
    target : Principal;
    status : FollowRequestStatus;
    timestamp : Int;
  };

  type Follow = {
    follower : Principal;
    following : Principal;
    timestamp : Int;
  };

  type Notification = {
    to : Principal;
    message : Text;
    timestamp : Int;
    isRead : Bool;
  };

  type Message = {
    from : Principal;
    to : Principal;
    content : Text;
    timestamp : Int;
    isRead : Bool;
  };

  // Internal post/reel types without embedded likes
  type PostData = {
    id : Nat;
    author : Principal;
    blobId : Text;
    caption : Text;
    timestamp : Int;
    commentCount : Nat;
  };

  type ReelData = {
    id : Nat;
    author : Principal;
    blobId : Text;
    caption : Text;
    timestamp : Int;
    commentCount : Nat;
  };

  // Public types with likes array (computed on read)
  type Post = {
    id : Nat;
    author : Principal;
    blobId : Text;
    caption : Text;
    timestamp : Int;
    likes : [Principal];
    commentCount : Nat;
  };

  type Reel = {
    id : Nat;
    author : Principal;
    blobId : Text;
    caption : Text;
    timestamp : Int;
    likes : [Principal];
    commentCount : Nat;
  };

  type Story = {
    id : Nat;
    author : Principal;
    blobId : Text;
    timestamp : Int;
  };

  type Comment = {
    id : Nat;
    contentId : Nat;
    author : Principal;
    text : Text;
    timestamp : Int;
  };

  // Comparison functions for sorting
  module Message {
    public func compareByTimestamp(a : Message, b : Message) : Order.Order {
      Int.compare(a.timestamp, b.timestamp);
    };
  };

  module PostSort {
    public func compareByTimestampDesc(a : Post, b : Post) : Order.Order {
      Int.compare(b.timestamp, a.timestamp);
    };
  };

  module ReelSort {
    public func compareByTimestampDesc(a : Reel, b : Reel) : Order.Order {
      Int.compare(b.timestamp, a.timestamp);
    };
  };

  let profiles = Map.empty<Principal, UserProfile.Profile>();
  let likes = Map.empty<Principal, List.List<Like>>();
  let followRequests = Map.empty<Principal, List.List<FollowRequest>>();
  let follows = Map.empty<Principal, List.List<Follow>>();
  let notifications = Map.empty<Principal, List.List<Notification>>();
  let messages = Map.empty<Principal, List.List<Message>>();
  let profilesInfo = Map.empty<Principal, UserProfile.InterestDisplayPrefs>();

  // Posts, Reels, Stories state
  var nextPostId : Nat = 1;
  var nextReelId : Nat = 1;
  var nextStoryId : Nat = 1;
  var nextCommentId : Nat = 1;

  let postsData = Map.empty<Nat, PostData>();
  let reelsData = Map.empty<Nat, ReelData>();
  let stories = Map.empty<Nat, Story>();
  let postComments = Map.empty<Nat, List.List<Comment>>();
  let reelComments = Map.empty<Nat, List.List<Comment>>();

  // Separate like lists for posts and reels (avoids array mutation issues)
  let postLikesMap = Map.empty<Nat, List.List<Principal>>();
  let reelLikesMap = Map.empty<Nat, List.List<Principal>>();

  // Helper: build Post from PostData + likes
  func buildPost(pd : PostData) : Post {
    let postLikes = switch (postLikesMap.get(pd.id)) {
      case (null) { [] };
      case (?lst) { lst.toArray() };
    };
    {
      id = pd.id;
      author = pd.author;
      blobId = pd.blobId;
      caption = pd.caption;
      timestamp = pd.timestamp;
      likes = postLikes;
      commentCount = pd.commentCount;
    };
  };

  // Helper: build Reel from ReelData + likes
  func buildReel(rd : ReelData) : Reel {
    let reelLikes = switch (reelLikesMap.get(rd.id)) {
      case (null) { [] };
      case (?lst) { lst.toArray() };
    };
    {
      id = rd.id;
      author = rd.author;
      blobId = rd.blobId;
      caption = rd.caption;
      timestamp = rd.timestamp;
      likes = reelLikes;
      commentCount = rd.commentCount;
    };
  };

  func isMatched(user1 : Principal, user2 : Principal) : Bool {
    switch (likes.get(user1)) {
      case (?user1Likes) {
        user1Likes.any(func(like) { like.to == user2 });
      };
      case (null) { false };
    };
  };

  // Helper: Check if there's any follow request between two users (in either direction)
  func hasFollowRequestBetween(user1 : Principal, user2 : Principal) : Bool {
    let user1Sent = switch (followRequests.get(user1)) {
      case (?requests) {
        requests.any(func(req) { req.target == user2 });
      };
      case (null) { false };
    };

    if (user1Sent) { return true };

    switch (followRequests.get(user2)) {
      case (?requests) {
        requests.any(func(req) { req.target == user1 });
      };
      case (null) { false };
    };
  };

  func areFollowing(user1 : Principal, user2 : Principal) : Bool {
    switch (follows.get(user1)) {
      case (?followList) {
        followList.any(func(f) { f.following == user2 });
      };
      case (null) { false };
    };
  };

  func messagesForPair(user1 : Principal, user2 : Principal) : [Message] {
    let pairMessages = switch (messages.get(user1)) {
      case (?user1Messages) {
        user1Messages.filter(func(m) { m.to == user2 }).toArray();
      };
      case (null) { [] };
    };

    let combined = switch (messages.get(user2)) {
      case (?user2Messages) {
        let user2ToUser1 = user2Messages.filter(func(m) { m.to == user1 }).toArray();
        pairMessages.concat(user2ToUser1);
      };
      case (null) { pairMessages };
    };

    combined.sort(Message.compareByTimestamp);
  };

  // Any logged-in user can view any profile (needed for public feed)
  public query ({ caller }) func getUserProfile(user : Principal) : async UserProfile.Profile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    switch (profiles.get(user)) {
      case (null) { Runtime.trap("Profile does not exist") };
      case (?profile) { profile };
    };
  };

  // Get username by any principal (public for feed display)
  public query ({ caller }) func getUsernameByPrincipal(user : Principal) : async ?Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can look up usernames");
    };
    principalToUsername.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile.Profile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    let fullProfile = {
      profile with
      principal = caller;
      lastActive = Time.now();
      isActive = true;
    };
    profiles.add(caller, fullProfile);
  };

  public shared ({ caller }) func saveCallerUserProfileInfo(profileInfo : UserProfile.InterestDisplayPrefs) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profile info");
    };
    profilesInfo.add(caller, profileInfo);
  };

  public shared ({ caller }) func setOnline() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can set online status");
    };
    switch (profiles.get(caller)) {
      case (null) { () };
      case (?profile) {
        profiles.add(caller, { profile with isActive = true });
      };
    };
  };

  public shared ({ caller }) func setOffline() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can set offline status");
    };
    switch (profiles.get(caller)) {
      case (null) { () };
      case (?profile) {
        profiles.add(caller, { profile with isActive = false });
      };
    };
  };

  public shared ({ caller }) func likeUser(likedUserId : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can like profiles");
    };
    let newLike = {
      from = caller;
      to = likedUserId;
      timestamp = Time.now();
    };
    switch (likes.get(caller)) {
      case (null) {
        likes.add(caller, List.fromArray<Like>([newLike]));
      };
      case (?existing) {
        existing.add(newLike);
        likes.add(caller, existing);
      };
    };
    let notification = {
      to = likedUserId;
      message = "You have a new like!";
      timestamp = Time.now();
      isRead = false;
    };
    switch (notifications.get(likedUserId)) {
      case (null) {
        notifications.add(likedUserId, List.fromArray<Notification>([notification]));
      };
      case (?existing) {
        existing.add(notification);
        notifications.add(likedUserId, existing);
      };
    };
  };

  public shared ({ caller }) func unlikeUser(_unlikedUserId : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can unlike profiles");
    };
    likes.remove(caller);
  };

  public query ({ caller }) func getWhoLikedMe() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view likes");
    };
    let result = List.empty<Principal>();
    for ((user, likeList) in likes.entries()) {
      likeList.forEach(func(like) {
        if (like.to == caller) {
          result.add(user);
        };
      });
    };
    result.toArray();
  };

  public query ({ caller }) func getWhoILiked() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view likes");
    };
    switch (likes.get(caller)) {
      case (null) { [] };
      case (?likeList) {
        likeList.map<Like, Principal>(func(like) { like.to }).toArray();
      };
    };
  };

  // ==================== FOLLOW REQUEST SYSTEM ====================

  public shared ({ caller }) func sendFollowRequest(targetUser : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can send follow requests");
    };

    if (caller == targetUser) {
      Runtime.trap("Cannot send follow request to yourself");
    };

    switch (followRequests.get(caller)) {
      case (?requests) {
        let exists = requests.any(func(req) { req.target == targetUser });
        if (exists) {
          Runtime.trap("Follow request already sent");
        };
      };
      case (null) { };
    };

    let newRequest : FollowRequest = {
      requester = caller;
      target = targetUser;
      status = #pending;
      timestamp = Time.now();
    };

    switch (followRequests.get(caller)) {
      case (null) {
        followRequests.add(caller, List.fromArray<FollowRequest>([newRequest]));
      };
      case (?existing) {
        existing.add(newRequest);
        followRequests.add(caller, existing);
      };
    };

    let notification = {
      to = targetUser;
      message = "You have a new follow request!";
      timestamp = Time.now();
      isRead = false;
    };
    switch (notifications.get(targetUser)) {
      case (null) {
        notifications.add(targetUser, List.fromArray<Notification>([notification]));
      };
      case (?existing) {
        existing.add(notification);
        notifications.add(targetUser, existing);
      };
    };
  };

  public shared ({ caller }) func acceptFollowRequest(requester : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can accept follow requests");
    };

    var found = false;
    switch (followRequests.get(requester)) {
      case (?requests) {
        let updated = requests.map<FollowRequest, FollowRequest>(func(req) {
          if (req.target == caller and req.status == #pending) {
            found := true;
            { req with status = #accepted };
          } else {
            req;
          };
        });
        followRequests.add(requester, updated);
      };
      case (null) { };
    };

    if (not found) {
      Runtime.trap("No pending follow request found");
    };

    let newFollow = {
      follower = requester;
      following = caller;
      timestamp = Time.now();
    };
    switch (follows.get(requester)) {
      case (null) {
        follows.add(requester, List.fromArray<Follow>([newFollow]));
      };
      case (?existing) {
        existing.add(newFollow);
        follows.add(requester, existing);
      };
    };

    let notification = {
      to = requester;
      message = "Your follow request was accepted!";
      timestamp = Time.now();
      isRead = false;
    };
    switch (notifications.get(requester)) {
      case (null) {
        notifications.add(requester, List.fromArray<Notification>([notification]));
      };
      case (?existing) {
        existing.add(notification);
        notifications.add(requester, existing);
      };
    };
  };

  public shared ({ caller }) func declineFollowRequest(requester : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can decline follow requests");
    };

    var found = false;
    switch (followRequests.get(requester)) {
      case (?requests) {
        let updated = requests.map<FollowRequest, FollowRequest>(func(req) {
          if (req.target == caller and req.status == #pending) {
            found := true;
            { req with status = #declined };
          } else {
            req;
          };
        });
        followRequests.add(requester, updated);
      };
      case (null) { };
    };

    if (not found) {
      Runtime.trap("No pending follow request found");
    };
  };

  public query ({ caller }) func getFollowRequestStatus(targetUser : Principal) : async ?FollowRequestStatus {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can check follow request status");
    };

    switch (followRequests.get(caller)) {
      case (?requests) {
        let filtered = requests.filter(func(req) { req.target == targetUser });
        let arr = filtered.toArray();
        if (arr.size() > 0) {
          ?arr[0].status;
        } else {
          null;
        };
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func isFollowing(user : Principal) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can check following status");
    };
    areFollowing(caller, user);
  };

  public query ({ caller }) func getPendingFollowRequests() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view follow requests");
    };

    let result = List.empty<Principal>();
    for ((requester, requests) in followRequests.entries()) {
      requests.forEach(func(req) {
        if (req.target == caller and req.status == #pending) {
          result.add(requester);
        };
      });
    };
    result.toArray();
  };

  public shared ({ caller }) func followUser(followedUserId : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can follow profiles");
    };
    let newFollow = {
      follower = caller;
      following = followedUserId;
      timestamp = Time.now();
    };
    switch (follows.get(caller)) {
      case (null) {
        follows.add(caller, List.fromArray<Follow>([newFollow]));
      };
      case (?existing) {
        existing.add(newFollow);
        follows.add(caller, existing);
      };
    };
  };

  public shared ({ caller }) func unfollowUser(unfollowedUserId : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can unfollow profiles");
    };
    switch (follows.get(caller)) {
      case (null) { () };
      case (?followingList) {
        let filtered = followingList.filter(func(f) { f.following != unfollowedUserId });
        follows.add(caller, filtered);
      };
    };
  };

  public query ({ caller }) func getFollowers() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view followers");
    };
    let result = List.empty<Principal>();
    for ((user, followList) in follows.entries()) {
      followList.forEach(func(follow) {
        if (follow.following == caller) {
          result.add(user);
        };
      });
    };
    result.toArray();
  };

  public query ({ caller }) func getFollowing() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view following");
    };
    switch (follows.get(caller)) {
      case (null) { [] };
      case (?followList) {
        followList.map<Follow, Principal>(func(follow) { follow.following }).toArray();
      };
    };
  };

  public query ({ caller }) func getFollowerCount() : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view follower count");
    };
    let followers = List.empty<Principal>();
    for ((user, followList) in follows.entries()) {
      followList.forEach(func(follow) {
        if (follow.following == caller) {
          followers.add(user);
        };
      });
    };
    followers.toArray().size();
  };

  public query ({ caller }) func getFollowingCount() : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view following count");
    };
    switch (follows.get(caller)) {
      case (null) { 0 };
      case (?followList) { followList.toArray().size() };
    };
  };

  // ==================== MESSAGING ====================

  public shared ({ caller }) func sendMessage(recipient : Principal, content : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };

    let hasRequest = hasFollowRequestBetween(caller, recipient);
    let matched = isMatched(caller, recipient) and isMatched(recipient, caller);
    let oneWayFollow = areFollowing(caller, recipient) or areFollowing(recipient, caller);

    if (not (hasRequest or matched or oneWayFollow)) {
      Runtime.trap("Unauthorized: Can only message users with a follow relationship");
    };

    let fullMessage = {
      from = caller;
      to = recipient;
      content;
      timestamp = Time.now();
      isRead = false;
    };

    let recipients = [caller, recipient];
    for (user in recipients.values()) {
      switch (messages.get(user)) {
        case (null) {
          messages.add(user, List.fromArray<Message>([fullMessage]));
        };
        case (?existing) {
          existing.add(fullMessage);
          messages.add(user, existing);
        };
      };
    };

    let notification = {
      to = recipient;
      message = "You have a new message!";
      timestamp = Time.now();
      isRead = false;
    };
    switch (notifications.get(recipient)) {
      case (null) {
        notifications.add(recipient, List.fromArray<Notification>([notification]));
      };
      case (?existing) {
        existing.add(notification);
        notifications.add(recipient, existing);
      };
    };
  };

  public query ({ caller }) func getConversationsWithUser(otherUser : Principal) : async [Message] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view conversations");
    };

    if (caller != otherUser) {
      let hasRequest = hasFollowRequestBetween(caller, otherUser);
      let matched = isMatched(caller, otherUser) and isMatched(otherUser, caller);
      let oneWayFollow = areFollowing(caller, otherUser) or areFollowing(otherUser, caller);

      if (not (hasRequest or matched or oneWayFollow)) {
        Runtime.trap("Unauthorized: Can only view conversations with users with a follow relationship");
      };
    };

    let allMessages = messagesForPair(caller, otherUser);
    allMessages.sort(Message.compareByTimestamp);
  };

  public query ({ caller }) func getAllConversations() : async [(Principal, [Message])] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view conversations");
    };

    let conversationMap = Map.empty<Principal, List.List<Message>>();

    switch (messages.get(caller)) {
      case (null) { () };
      case (?messageList) {
        messageList.forEach(func(msg) {
          let otherUser = if (msg.from == caller) { msg.to } else { msg.from };
          switch (conversationMap.get(otherUser)) {
            case (null) {
              conversationMap.add(otherUser, List.fromArray<Message>([msg]));
            };
            case (?existing) {
              existing.add(msg);
              conversationMap.add(otherUser, existing);
            };
          };
        });
      };
    };

    conversationMap.entries().map<(Principal, List.List<Message>), (Principal, [Message])>(
      func((user, msgList)) {
        (user, msgList.toArray().sort(Message.compareByTimestamp));
      }
    ).toArray();
  };

  public query ({ caller }) func getNotifications() : async [Notification] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view notifications");
    };

    switch (notifications.get(caller)) {
      case (null) { [] };
      case (?notificationList) {
        notificationList.toArray();
      };
    };
  };

  public shared ({ caller }) func markNotificationAsRead(_timestamp : Int) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };

    switch (notifications.get(caller)) {
      case (null) { () };
      case (?notificationList) {
        let mapped = notificationList.map<Notification, Notification>(
          func(notification) {
            if (not notification.isRead) {
              { notification with isRead = true };
            } else {
              notification;
            };
          }
        );
        notifications.add(caller, mapped);
      };
    };
  };

  public query ({ caller }) func getUnreadNotificationCount() : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view notification count");
    };

    switch (notifications.get(caller)) {
      case (null) {
        0;
      };
      case (?notificationList) {
        notificationList.filter(func(notification) { not notification.isRead }).toArray().size();
      };
    };
  };

  public query ({ caller }) func getUserCount() : async Nat {
    profiles.keys().toArray().size();
  };

  public query ({ caller }) func getAllProfiles() : async [UserProfile.Profile] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can browse profiles");
    };

    let result = List.empty<UserProfile.Profile>();
    for ((principal, profile) in profiles.entries()) {
      if (profile.displayName != "" and principal != caller) {
        result.add(profile);
      };
    };
    result.toArray();
  };

  public type SearchResult = {
    principal : Principal;
    displayName : Text;
    photoLink : Text;
    username : Text;
  };

  public query ({ caller }) func searchUsers(searchQuery : Text) : async [SearchResult] {
    let q = searchQuery.toLower();
    let result = List.empty<SearchResult>();
    for ((p, profile) in profiles.entries()) {
      if (profile.displayName != "" and p != caller) {
        let uname = switch (principalToUsername.get(p)) {
          case (?u) { u };
          case (null) { "" };
        };
        let nameMatch = profile.displayName.toLower().contains(#text q);
        let usernameMatch = uname.toLower().contains(#text q);
        if (nameMatch or usernameMatch) {
          result.add({
            principal = p;
            displayName = profile.displayName;
            photoLink = profile.photoLink;
            username = uname;
          });
        };
      };
    };
    result.toArray();
  };

  public query ({ caller }) func isAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public shared ({ caller }) func fillSampleData() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can fill sample data");
    };

    let sampleProfiles = [
      {
        id = 1;
        principal = Principal.fromActor(actor "1");
        displayName = "Alice";
        bio = "Love hiking and adventures!";
        lastActive = Time.now();
        photoLink = "https://example.com/alice.jpg";
        isActive = true;
        gender = #female;
        genderPreference = #male;
        interests = [{ id = 1; name = "Hiking" }];
      },
      {
        id = 2;
        principal = Principal.fromActor(actor "2");
        displayName = "Bob";
        bio = "Bookworm";
        lastActive = Time.now();
        photoLink = "https://example.com/bob.jpg";
        isActive = true;
        gender = #male;
        genderPreference = #female;
        interests = [{ id = 2; name = "Reading" }];
      },
      {
        id = 3;
        principal = Principal.fromActor(actor "3");
        displayName = "Carol";
        bio = "Food is life";
        lastActive = Time.now();
        photoLink = "https://example.com/carol.jpg";
        isActive = true;
        gender = #female;
        genderPreference = #male;
        interests = [{ id = 3; name = "Cooking" }];
      },
    ];

    for (profile in sampleProfiles.values()) {
      profiles.add(profile.principal, profile);
    };
  };

  public query ({ caller }) func isAuthenticated() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #user);
  };

  // Username/Password credential system
  type UserCredentials = {
    principal : Principal;
    passwordHash : Text;
  };

  let usernameCredentials = Map.empty<Text, UserCredentials>();
  let principalToUsername = Map.empty<Principal, Text>();

  public query func isUsernameAvailable(username : Text) : async Bool {
    switch (usernameCredentials.get(username)) {
      case (null) { true };
      case (?_) { false };
    };
  };

  public shared ({ caller }) func registerWithCredentials(username : Text, passwordHash : Text) : async { #ok; #usernameTaken; #alreadyRegistered } {
    switch (principalToUsername.get(caller)) {
      case (?_) { return #alreadyRegistered };
      case (null) {};
    };
    switch (usernameCredentials.get(username)) {
      case (?_) { return #usernameTaken };
      case (null) {
        usernameCredentials.add(username, { principal = caller; passwordHash = passwordHash });
        principalToUsername.add(caller, username);
        switch (accessControlState.userRoles.get(caller)) {
          case (null) {
            accessControlState.userRoles.add(caller, #user);
          };
          case (?_) {};
        };
        #ok;
      };
    };
  };

  public query ({ caller }) func loginWithCredentials(username : Text, passwordHash : Text) : async Bool {
    switch (usernameCredentials.get(username)) {
      case (null) { false };
      case (?creds) {
        creds.principal == caller and creds.passwordHash == passwordHash;
      };
    };
  };

  public query ({ caller }) func getMyProfile() : async ?UserProfile.Profile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view their profile");
    };
    profiles.get(caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile.Profile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view their profile");
    };
    profiles.get(caller);
  };

  public query ({ caller }) func hasCompletedOnboarding() : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can check onboarding status");
    };
    switch (profiles.get(caller)) {
      case (null) { false };
      case (?profile) { profile.displayName != "" };
    };
  };

  public query ({ caller }) func getMyUsername() : async ?Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view their username");
    };
    principalToUsername.get(caller);
  };

  // ==================== POSTS ====================

  public shared ({ caller }) func createPost(blobId : Text, caption : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create posts");
    };
    let postId = nextPostId;
    nextPostId += 1;
    let newPost : PostData = {
      id = postId;
      author = caller;
      blobId;
      caption;
      timestamp = Time.now();
      commentCount = 0;
    };
    postsData.add(postId, newPost);
    postId;
  };

  public query ({ caller }) func getAllPosts() : async [Post] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view posts");
    };
    let result = List.empty<Post>();
    for ((_, pd) in postsData.entries()) {
      result.add(buildPost(pd));
    };
    result.toArray().sort(PostSort.compareByTimestampDesc);
  };

  public query ({ caller }) func getPostsByUser(user : Principal) : async [Post] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view posts");
    };
    let result = List.empty<Post>();
    for ((_, pd) in postsData.entries()) {
      if (pd.author == user) {
        result.add(buildPost(pd));
      };
    };
    result.toArray().sort(PostSort.compareByTimestampDesc);
  };

  public shared ({ caller }) func likePost(postId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can like posts");
    };
    switch (postsData.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?_) {
        switch (postLikesMap.get(postId)) {
          case (null) {
            postLikesMap.add(postId, List.fromArray<Principal>([caller]));
          };
          case (?existing) {
            if (not existing.any(func(p) { p == caller })) {
              existing.add(caller);
              postLikesMap.add(postId, existing);
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func unlikePost(postId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can unlike posts");
    };
    switch (postLikesMap.get(postId)) {
      case (null) { () };
      case (?existing) {
        let filtered = existing.filter(func(p) { p != caller });
        postLikesMap.add(postId, filtered);
      };
    };
  };

  public shared ({ caller }) func commentOnPost(postId : Nat, text : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can comment");
    };
    switch (postsData.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?pd) {
        let commentId = nextCommentId;
        nextCommentId += 1;
        let newComment : Comment = {
          id = commentId;
          contentId = postId;
          author = caller;
          text;
          timestamp = Time.now();
        };
        switch (postComments.get(postId)) {
          case (null) {
            postComments.add(postId, List.fromArray<Comment>([newComment]));
          };
          case (?existing) {
            existing.add(newComment);
            postComments.add(postId, existing);
          };
        };
        postsData.add(postId, { pd with commentCount = pd.commentCount + 1 });
        commentId;
      };
    };
  };

  public query ({ caller }) func getPostComments(postId : Nat) : async [Comment] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view comments");
    };
    switch (postComments.get(postId)) {
      case (null) { [] };
      case (?commentList) { commentList.toArray() };
    };
  };

  public shared ({ caller }) func deletePost(postId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete posts");
    };
    switch (postsData.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?pd) {
        if (pd.author != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only delete your own posts");
        };
        postsData.remove(postId);
        postLikesMap.remove(postId);
        postComments.remove(postId);
      };
    };
  };

  // ==================== REELS ====================

  public shared ({ caller }) func createReel(blobId : Text, caption : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create reels");
    };
    let reelId = nextReelId;
    nextReelId += 1;
    let newReel : ReelData = {
      id = reelId;
      author = caller;
      blobId;
      caption;
      timestamp = Time.now();
      commentCount = 0;
    };
    reelsData.add(reelId, newReel);
    reelId;
  };

  public query ({ caller }) func getAllReels() : async [Reel] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view reels");
    };
    let result = List.empty<Reel>();
    for ((_, rd) in reelsData.entries()) {
      result.add(buildReel(rd));
    };
    result.toArray().sort(ReelSort.compareByTimestampDesc);
  };

  public query ({ caller }) func getReelsByUser(user : Principal) : async [Reel] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view reels");
    };
    let result = List.empty<Reel>();
    for ((_, rd) in reelsData.entries()) {
      if (rd.author == user) {
        result.add(buildReel(rd));
      };
    };
    result.toArray().sort(ReelSort.compareByTimestampDesc);
  };

  public shared ({ caller }) func likeReel(reelId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can like reels");
    };
    switch (reelsData.get(reelId)) {
      case (null) { Runtime.trap("Reel not found") };
      case (?_) {
        switch (reelLikesMap.get(reelId)) {
          case (null) {
            reelLikesMap.add(reelId, List.fromArray<Principal>([caller]));
          };
          case (?existing) {
            if (not existing.any(func(p) { p == caller })) {
              existing.add(caller);
              reelLikesMap.add(reelId, existing);
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func unlikeReel(reelId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can unlike reels");
    };
    switch (reelLikesMap.get(reelId)) {
      case (null) { () };
      case (?existing) {
        let filtered = existing.filter(func(p) { p != caller });
        reelLikesMap.add(reelId, filtered);
      };
    };
  };

  public shared ({ caller }) func commentOnReel(reelId : Nat, text : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can comment");
    };
    switch (reelsData.get(reelId)) {
      case (null) { Runtime.trap("Reel not found") };
      case (?rd) {
        let commentId = nextCommentId;
        nextCommentId += 1;
        let newComment : Comment = {
          id = commentId;
          contentId = reelId;
          author = caller;
          text;
          timestamp = Time.now();
        };
        switch (reelComments.get(reelId)) {
          case (null) {
            reelComments.add(reelId, List.fromArray<Comment>([newComment]));
          };
          case (?existing) {
            existing.add(newComment);
            reelComments.add(reelId, existing);
          };
        };
        reelsData.add(reelId, { rd with commentCount = rd.commentCount + 1 });
        commentId;
      };
    };
  };

  public query ({ caller }) func getReelComments(reelId : Nat) : async [Comment] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view comments");
    };
    switch (reelComments.get(reelId)) {
      case (null) { [] };
      case (?commentList) { commentList.toArray() };
    };
  };

  public shared ({ caller }) func deleteReel(reelId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete reels");
    };
    switch (reelsData.get(reelId)) {
      case (null) { Runtime.trap("Reel not found") };
      case (?rd) {
        if (rd.author != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only delete your own reels");
        };
        reelsData.remove(reelId);
        reelLikesMap.remove(reelId);
        reelComments.remove(reelId);
      };
    };
  };

  // ==================== STORIES ====================

  public shared ({ caller }) func createStory(blobId : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create stories");
    };
    let storyId = nextStoryId;
    nextStoryId += 1;
    let newStory : Story = {
      id = storyId;
      author = caller;
      blobId;
      timestamp = Time.now();
    };
    stories.add(storyId, newStory);
    storyId;
  };

  public query ({ caller }) func getActiveStories() : async [Story] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view stories");
    };
    let oneDayNanos : Int = 86_400_000_000_000;
    let now = Time.now();
    let result = List.empty<Story>();
    for ((_, story) in stories.entries()) {
      if (now - story.timestamp < oneDayNanos) {
        result.add(story);
      };
    };
    result.toArray();
  };

  public shared ({ caller }) func deleteExpiredStories() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    let oneDayNanos : Int = 86_400_000_000_000;
    let now = Time.now();
    for ((storyId, story) in stories.entries()) {
      if (now - story.timestamp >= oneDayNanos) {
        stories.remove(storyId);
      };
    };
  };

  // ==================== PASSWORD RESET ====================

  type SecurityQuestion = {
    question : Text;
    answerHash : Text;
  };

  let securityQuestions = Map.empty<Text, SecurityQuestion>();
  let otpStore = Map.empty<Text, Text>();
  let passwordResetRequests = Map.empty<Text, Int>();

  public shared ({ caller }) func setSecurityQuestion(question : Text, answerHash : Text) : async () {
    switch (principalToUsername.get(caller)) {
      case (null) { Runtime.trap("User not registered") };
      case (?username) {
        securityQuestions.add(username, { question; answerHash });
      };
    };
  };

  public query func getSecurityQuestion(username : Text) : async ?Text {
    switch (securityQuestions.get(username)) {
      case (null) { null };
      case (?sq) { ?sq.question };
    };
  };

  public query func verifySecurityAnswer(username : Text, answerHash : Text) : async ?Text {
    switch (securityQuestions.get(username)) {
      case (null) { null };
      case (?sq) {
        if (sq.answerHash == answerHash) {
          ?"123456"
        } else {
          null
        }
      };
    };
  };

  public shared func resetPasswordWithOtp(username : Text, otp : Text, newPasswordHash : Text) : async Bool {
    switch (otpStore.get(username)) {
      case (null) {
        // Also accept the hardcoded demo OTP
        if (otp == "123456") {
          switch (usernameCredentials.get(username)) {
            case (null) { false };
            case (?creds) {
              usernameCredentials.add(username, { principal = creds.principal; passwordHash = newPasswordHash });
              true
            };
          };
        } else { false }
      };
      case (?storedOtp) {
        if (storedOtp == otp) {
          switch (usernameCredentials.get(username)) {
            case (null) { false };
            case (?creds) {
              usernameCredentials.add(username, { principal = creds.principal; passwordHash = newPasswordHash });
              otpStore.remove(username);
              true
            };
          };
        } else {
          false
        }
      };
    };
  };

  public shared func requestAdminPasswordReset(username : Text) : async () {
    switch (usernameCredentials.get(username)) {
      case (null) { Runtime.trap("Username not found") };
      case (?_) {
        passwordResetRequests.add(username, Time.now());
      };
    };
  };

  type PasswordResetRequestInfo = {
    username : Text;
    requestTime : Int;
  };

  public query ({ caller }) func getPendingPasswordResetRequests() : async [PasswordResetRequestInfo] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let result = List.empty<PasswordResetRequestInfo>();
    for ((username, requestTime) in passwordResetRequests.entries()) {
      result.add({ username; requestTime });
    };
    result.toArray();
  };

  public shared ({ caller }) func adminResetPassword(username : Text, newPasswordHash : Text) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    switch (usernameCredentials.get(username)) {
      case (null) { false };
      case (?creds) {
        usernameCredentials.add(username, { principal = creds.principal; passwordHash = newPasswordHash });
        passwordResetRequests.remove(username);
        true
      };
    };
  };

};
