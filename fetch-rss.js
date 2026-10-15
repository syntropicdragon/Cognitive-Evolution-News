#!/usr/bin/env node

/**
 * Fetches archaeological research news from RSS feeds,
 * extracts summaries, and saves to a JSON file for the static site.
 * Run: node fetch-rss.js
 */

import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import { formatDistanceToNow } from 'date-fns';
import fs from 'fs';
import path from 'path';

const FEEDS = [
  {
    name: 'ScienceDaily - Fossils & Ruins',
    url: 'https://feeds.feedburner.com/sciencedaily/fossils_ruins',
    category: 'news',
    keywords: ['archaeology', 'archaeological', 'paleolithic', 'neolithic', 'mesolithic', 'hominin', 'neanderthal', 'denisovan', 'early human', 'cave art', 'stone age', 'fossil', 'paleoanthropology', 'hominid', 'pleistocene']
  },
  {
    name: 'HeritageDaily - Archaeology News',
    url: 'https://www.heritagedaily.com/feed/',
    category: 'news',
    keywords: []
  },
  {
    name: 'SAPIENS - Anthropology',
    url: 'https://www.sapiens.org/feed/',
    category: 'news',
    keywords: []
  },
  {
    name: 'arXiv - Human Evolution & Archaeology',
    url: 'http://export.arxiv.org/api/query?search_query=all:("human evolution"+OR+paleoanthropology+OR+hominin+OR+hominid+OR+neanderthal+OR+denisovan+OR+paleolithic+OR+pleistocene)&start=0&max_results=15&sortBy=submittedDate&sortOrder=descending',
    category: 'preprint',
    keywords: ['archaeology', 'archaeological', 'paleoanthropology', 'human evolution', 'hominin', 'neanderthal', 'denisovan', 'pleistocene', 'paleolithic']
  },
  {
    name: 'arXiv - Archaeology',
    url: 'http://export.arxiv.org/api/query?search_query=all:(archaeology+OR+archaeological+OR+archaeometric+OR+archaeobotany+OR+geoarchaeology+OR+zooarchaeology)&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending',
    category: 'preprint',
    keywords: []
  },
  {
    name: 'PLOS ONE - Archaeology Section',
    url: 'https://journals.plos.org/plosone/feed/atom?subject=337',
    category: 'journal',
    keywords: ['archaeology', 'archaeological', 'paleo']
  },
  {
    name: 'Archaeology News Network',
    url: 'https://archaeologynewsnetwork.blogspot.com/feeds/posts/default',
    category: 'news',
    keywords: []
  }
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  trimValues: true,
});

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, { timeout: 10000 });
    if (!res.ok) {
      console.log(`  [${feed.name}] HTTP ${res.status} - skipping`);
      return [];
    }
    const xml = await res.text();
    const json = parser.parse(xml);
    return parseFeed(json, feed);
  } catch (err) {
    console.log(`  [${feed.name}] Error: ${err.message}`);
    return [];
  }
}

function parseFeed(json, feed) {
  const items = [];
  
  // Normalize different RSS/Atom structures
  let entries;
  if (json.rss && json.rss.channel && json.rss.channel.item) {
    entries = Array.isArray(json.rss.channel.item) ? json.rss.channel.item : [json.rss.channel.item];
  } else if (json.feed && json.feed.entry) {
    entries = Array.isArray(json.feed.entry) ? json.feed.entry : [json.feed.entry];
  } else if (json.feed) {
    entries = Array.isArray(json.feed) ? json.feed : [json.feed];
  } else {
    return items;
  }

  for (const entry of entries) {
    let title, link, pubDate, description, summary, authors;
    
    // Normalize entry to handle _ prefix from XMLParser
    const getValue = (obj) => {
      if (!obj) return null;
      if (typeof obj === 'string') return obj;
      if (obj._) return obj._;
      if (obj['#text']) return obj['#text'];
      return String(obj);
    };

    // Handle Atom format
    if (entry.title) {
      title = getValue(entry.title);
    }
    if (entry.link) {
      if (Array.isArray(entry.link)) {
        link = entry.link.find(l => l['@_rel'] === 'alternate')?.['@_href'] || entry.link[0]['@_href'] || getValue(entry.link[0]);
      } else if (entry.link['@_href']) {
        link = entry.link['@_href'];
      } else {
        link = getValue(entry.link);
      }
    }
    if (entry.published) {
      pubDate = getValue(entry.published);
    } else if (entry.updated) {
      pubDate = getValue(entry.updated);
    } else if (entry.pubDate) {
      pubDate = getValue(entry.pubDate);
    }
    
    // Handle description/summary
    if (entry.summary) {
      summary = getValue(entry.summary);
    } else if (entry.description) {
      summary = getValue(entry.description);
    } else if (entry.content) {
      summary = getValue(entry.content);
    }

    // Handle RSS format
    if (entry.title && !title) title = getValue(entry.title);
    if (entry.link && !link && typeof entry.link === 'string') link = entry.link;
    if (entry.pubDate && !pubDate) pubDate = getValue(entry.pubDate);
    if (entry.description && !summary) summary = getValue(entry.description);
    
    // Try content:encoded for RSS
    if (!summary && entry['content:encoded']) {
      summary = getValue(entry['content:encoded']);
    }
    if (!summary && entry.content) {
      summary = getValue(entry.content);
    }

    // arXiv specific
    if (entry['@_arxiv:primary-category']) {
      feed.category = 'preprint';
    }

    // Clean up summary - handle various formats
    if (summary) {
      // Handle string or object (Atom feeds may have summary as object with _ or #text)
      if (typeof summary !== 'string') {
        if (summary._) summary = summary._;
        else if (summary['#text']) summary = summary['#text'];
        else summary = String(summary);
      }
      
      // Remove HTML tags
      summary = summary.replace(/<[^>]*>/g, '').trim();
      
      // Clean up multiple spaces and newlines
      summary = summary.replace(/\s+/g, ' ').trim();
      
      // Truncate to ~300 words but keep full sentences
      const sentences = summary.split(/[.!?]+/);
      let truncated = '';
      let wordCount = 0;
      for (const sentence of sentences) {
        if (!sentence.trim()) continue;
        const words = sentence.split(/\s+/).length;
        if (wordCount + words > 300) break;
        truncated += (truncated ? ' ' : '') + sentence + '.';
        wordCount += words;
      }
      summary = truncated.trim();
      if (summary && !/[.!?]$/.test(summary)) summary += '.';
    }

    // Extract authors if available
    if (entry.author) {
      if (Array.isArray(entry.author)) {
        authors = entry.author.map(a => {
          if (typeof a === 'string') return a;
          if (a.name) return a.name;
          if (a._) return a._;
          return String(a);
        }).join(', ');
      } else if (typeof entry.author === 'object') {
        authors = entry.author.name || entry.author._ || String(entry.author);
      } else {
        authors = String(entry.author);
      }
    } else if (entry['dc:creator']) {
      authors = entry['dc:creator'];
      if (typeof authors === 'object') {
        authors = authors._ || String(authors);
      }
    } else if (entry.creator) {
      authors = entry.creator;
      if (typeof authors === 'object') {
        authors = authors._ || String(authors);
      }
    }
    
    // Clean authors
    if (authors) {
      authors = authors.replace(/<[^>]*>/g, '').trim();
    }

    if (!title || !link) continue;

    // Filter items by keywords if feed has them
    if (feed.keywords && feed.keywords.length > 0) {
      const titleLower = title.toLowerCase();
      const summaryLower = (summary || '').toLowerCase();
      const combinedText = titleLower + ' ' + summaryLower;
      const matchesKeyword = feed.keywords.some(kw => combinedText.includes(kw.toLowerCase()));
      if (!matchesKeyword) {
        continue;
      }
    }

    items.push({
      title,
      link,
      pubDate,
      date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      summary,
      source: feed.name,
      category: feed.category,
      authors,
      timeAgo: pubDate ? formatDistanceToNow(new Date(pubDate), { addSuffix: true }) : 'recently'
    });
  }

  return items;
}

async function main() {
  console.log('Fetching archaeological research news...\n');
  
  const allItems = [];
  for (const feed of FEEDS) {
    console.log(`Fetching: ${feed.name}...`);
    const items = await fetchFeed(feed);
    console.log(`  Found ${items.length} items\n`);
    allItems.push(...items);
  }

  // Sort by date, newest first
  allItems.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Deduplicate by link
  const seen = new Set();
  const uniqueItems = allItems.filter(item => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  // Limit to 50 most recent
  const finalItems = uniqueItems.slice(0, 50);

  console.log(`Total unique items: ${finalItems.length}`);

  // Save to JSON
  const outputPath = path.join(process.cwd(), 'src', 'data', 'news.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(finalItems, null, 2));
  
  console.log(`\n✅ Saved ${finalItems.length} news items to ${outputPath}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
