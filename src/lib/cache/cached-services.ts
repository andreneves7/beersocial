/**
 * Cache Service with Database Integration
 * 
 * Integra o sistema de cache com as APIs da aplicação BeerSocial
 * Usa MongoDB para persistência (sem Prisma/SQLite)
 */

import { getCacheManager, CacheManager } from './cache-manager';
import { CacheKeys, CacheTags, CacheAside } from './decorators';
import { getMongoDB } from '../mongodb-client';

// Tipos
interface BeerWithStats {
  _id: string;
  name: string;
  brewery: string;
  style: string;
  abv: number;
  ibu?: number;
  description?: string;
  image?: string;
  country?: string;
  avgRating: number;
  reviewCount: number;
}

interface UserWithStats {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  location?: string;
  favoriteBeer?: string;
  reviewsCount: number;
  friendsCount: number;
  avgRating: number;
}

interface NotificationWithUser {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Cached Beer Service
 */
export class CachedBeerService {
  private cache: CacheManager;
  private beerCache: CacheAside<BeerWithStats>;
  
  constructor() {
    this.cache = getCacheManager();
    this.beerCache = new CacheAside('beer', 600, [CacheTags.BEER]);
  }
  
  /**
   * Get beer with caching
   */
  async getBeer(id: string): Promise<BeerWithStats | null> {
    return this.beerCache.get(id, async () => {
      const mongo = await getMongoDB();
      const beer = await mongo.getBeerById(id);
      
      if (!beer) return null;
      
      // Obter stats de reviews
      const stats = await mongo.getBeerReviewStats(id);
      
      return {
        _id: beer._id,
        name: beer.name,
        brewery: beer.brewery,
        style: beer.style,
        abv: beer.abv,
        ibu: beer.ibu,
        description: beer.description,
        image: beer.image,
        country: beer.country,
        avgRating: stats.avgRating,
        reviewCount: stats.totalReviews
      };
    });
  }
  
  /**
   * Get beers list with caching
   */
  async getBeers(options: {
    search?: string;
    style?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ beers: BeerWithStats[]; total: number }> {
    const key = CacheKeys.beers(options);
    
    const cached = await this.cache.get<{ beers: BeerWithStats[]; total: number }>(key);
    if (cached) return cached.value;
    
    const mongo = await getMongoDB();
    
    const [beers, total] = await Promise.all([
      mongo.getBeers({
        search: options.search,
        style: options.style
      }, options.limit || 20, options.offset || 0),
      mongo.countBeers({
        search: options.search,
        style: options.style
      })
    ]);
    
    const beersWithRating = await Promise.all(
      beers.map(async (beer) => {
        const stats = await mongo.getBeerReviewStats(beer._id);
        return {
          _id: beer._id,
          name: beer.name,
          brewery: beer.brewery,
          style: beer.style,
          abv: beer.abv,
          ibu: beer.ibu,
          description: beer.description,
          image: beer.image,
          country: beer.country,
          avgRating: stats.avgRating,
          reviewCount: stats.totalReviews
        };
      })
    );
    
    const result = { beers: beersWithRating, total };
    
    await this.cache.set(key, result, 120, [CacheTags.BEER, CacheTags.SEARCH]);
    
    return result;
  }
  
  /**
   * Invalidate beer cache
   */
  async invalidateBeer(id: string): Promise<void> {
    await Promise.all([
      this.cache.delete(CacheKeys.beer(id)),
      this.cache.invalidateByTag(CacheTags.forBeer(id)),
      this.cache.invalidate('beers:*'),
    ]);
  }
}

/**
 * Cached User Service
 */
export class CachedUserService {
  private cache: CacheManager;
  private userCache: CacheAside<UserWithStats>;
  
  constructor() {
    this.cache = getCacheManager();
    this.userCache = new CacheAside('user', 300, [CacheTags.USER]);
  }
  
  /**
   * Get user profile with caching
   */
  async getUser(id: string): Promise<UserWithStats | null> {
    return this.userCache.get(id, async () => {
      const mongo = await getMongoDB();
      const user = await mongo.getUserById(id);
      
      if (!user) return null;
      
      // Count friends
      const friendsCount = await mongo.countFriends(id);
      
      // Get reviews and calculate avg rating
      const reviews = await mongo.getReviewsByUser(id, 1000);
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
      
      return {
        _id: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        favoriteBeer: user.favoriteBeer,
        reviewsCount: reviews.length,
        friendsCount,
        avgRating: Math.round(avgRating * 10) / 10
      };
    });
  }
  
  /**
   * Invalidate user cache
   */
  async invalidateUser(id: string): Promise<void> {
    await Promise.all([
      this.cache.delete(CacheKeys.user(id)),
      this.cache.invalidateByTag(CacheTags.forUser(id)),
    ]);
  }
}

/**
 * Cached Notification Service
 */
export class CachedNotificationService {
  private cache: CacheManager;
  
  constructor() {
    this.cache = getCacheManager();
  }
  
  /**
   * Get user notifications with caching
   */
  async getNotifications(userId: string, limit: number = 20): Promise<NotificationWithUser[]> {
    const key = CacheKeys.userNotifications(userId);
    
    const cached = await this.cache.get<NotificationWithUser[]>(key);
    if (cached) return cached.value;
    
    const mongo = await getMongoDB();
    const notifications = await mongo.getNotifications(userId, limit);
    
    await this.cache.set(key, notifications as unknown as NotificationWithUser[], 30, [CacheTags.NOTIFICATION, CacheTags.forUser(userId)]);
    
    return notifications as unknown as NotificationWithUser[];
  }
  
  /**
   * Get unread count with caching
   */
  async getUnreadCount(userId: string): Promise<number> {
    const key = CacheKeys.userUnreadNotifications(userId);
    
    const cached = await this.cache.get<number>(key);
    if (cached) return cached.value;
    
    const mongo = await getMongoDB();
    const count = await mongo.countUnreadNotifications(userId);
    
    await this.cache.set(key, count, 30, [CacheTags.NOTIFICATION]);
    
    return count;
  }
  
  /**
   * Invalidate notifications cache
   */
  async invalidateNotifications(userId: string): Promise<void> {
    await Promise.all([
      this.cache.delete(CacheKeys.userNotifications(userId)),
      this.cache.delete(CacheKeys.userUnreadNotifications(userId)),
    ]);
  }
  
  /**
   * Create notification and invalidate cache
   */
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: string;
  }): Promise<void> {
    const mongo = await getMongoDB();
    await mongo.createNotification({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data || '',
    });
    await this.invalidateNotifications(data.userId);
  }
}

// Singleton instances
export const cachedBeerService = new CachedBeerService();
export const cachedUserService = new CachedUserService();
export const cachedNotificationService = new CachedNotificationService();
