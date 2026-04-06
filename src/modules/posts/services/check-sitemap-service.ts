import api from '##/shared/services/api';
import redis from '##/shared/services/redis';
import * as cheerio from 'cheerio';
import { parseISO, subHours } from 'date-fns';

interface SitemapEntry {
  loc: string;
  lastmod: Date;
}

interface TopicEntry {
  loc: string;
  lastmod: Date;
  changefreq?: string;
  priority?: string;
}

async function fetchAndParseSitemap(url: string) {
  const response = await api.get(url);
  if (!response.data) {
    throw new Error(`Fetch returned no data for ${url}`);
  }
  return cheerio.load(response.data, { xmlMode: true });
}

async function getModifiedSitemaps(mainSitemapUrl: string, since: Date): Promise<SitemapEntry[]> {
  const $ = await fetchAndParseSitemap(mainSitemapUrl);
  const sitemaps: SitemapEntry[] = [];

  $('sitemap').each((_, element) => {
    const loc = $(element).find('loc').text();
    const lastmodStr = $(element).find('lastmod').text();
    const lastmod = parseISO(lastmodStr);

    if (lastmod >= since) {
      sitemaps.push({ loc, lastmod });
    }
  });

  return sitemaps;
}

async function getRecentTopicsFromSitemap(sitemapUrl: string, since: Date): Promise<TopicEntry[]> {
  const $ = await fetchAndParseSitemap(sitemapUrl);
  const topics: TopicEntry[] = [];

  $('url').each((_, element) => {
    const loc = $(element).find('loc').text();
    const lastmodStr = $(element).find('lastmod').text();
    // Some entries might not have lastmod, or it might be invalid
    if (!lastmodStr) return;

    const lastmod = parseISO(lastmodStr);

    if (lastmod >= since) {
      topics.push({
        loc,
        lastmod,
        changefreq: $(element).find('changefreq').text(),
        priority: $(element).find('priority').text(),
      });
    }
  });

  return topics;
}

export async function checkSiteMap() {
  const mainSitemapUrl = 'https://bitcointalk.org/sitemap.php';
  const REDIS_KEY = 'sitemap:last-check';

  const lastCheck = await redis.get(REDIS_KEY);
  const since = lastCheck ? parseISO(lastCheck) : subHours(new Date(), 24);

  // Capture start time to update redis later
  const startTime = new Date();

  console.log(`Checking sitemap for modifications since: ${since.toISOString()}`);

  try {
    const recentSitemaps = await getModifiedSitemaps(mainSitemapUrl, since);
    // Sort sitemaps by lastmod descending
    recentSitemaps.sort((a, b) => b.lastmod.getTime() - a.lastmod.getTime());

    console.log(`Found ${recentSitemaps.length} recently modified sitemaps.`);

    for (const sitemap of recentSitemaps) {
      console.log(`Fetching topics from: ${sitemap.loc}`);
      const recentTopics = await getRecentTopicsFromSitemap(sitemap.loc, since);
      // Sort topics by lastmod descending
      recentTopics.sort((a, b) => b.lastmod.getTime() - a.lastmod.getTime());

      console.log(`Found ${recentTopics.length} recent topics in ${sitemap.loc}`);

      for (const topic of recentTopics) {
        console.log(`##Topic: ${topic.loc} (Last mod: ${topic.lastmod.toISOString()})`);
        // Here we can add analysis logic later as requested
      }
    }

    // Update last check time
    await redis.set(REDIS_KEY, startTime.toISOString());
    console.log(`Updated last check time to: ${startTime.toISOString()}`);
  } catch (error) {
    console.error('Error checking sitemap:', error);
  }
}

checkSiteMap();
