import cheerio from 'cheerio';
import { AxiosResponse } from 'axios';
import { Request } from 'express';
import { ISeasonsList, ISeries, ISeriesDetails, IEpisode } from '@/types';

/**
 * Scrape series asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<ISeries>} array of series objects
 */
export const scrapeSeries = async (
    req: Request,
    res: AxiosResponse
): Promise<ISeries[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: ISeries[] = [];
    const {
        headers: { host },
        protocol,
    } = req;

    // New structure: div.gallery-grid contains figure elements
    $('div.gallery-grid')
        .find('figure')
        .each((i, el) => {
            const parent: cheerio.Cheerio = $(el);
            const link: cheerio.Cheerio = $(parent).find('a');
            const genres: string[] = [];

            // Extract genres from plain text (e.g., "Comedy, Drama")
            const genreText = $(link).find('figcaption > div').first().text().trim();
            if (genreText) {
                genres.push(...genreText.split(',').map(g => g.trim().toLowerCase()));
            }

            // Extract series ID from href
            const href = $(link).attr('href') ?? '';
            const seriesId: string = href.split('/').filter(Boolean).pop() ?? '';

            const obj = {} as ISeries;

            obj['_id'] = seriesId;
            obj['title'] = $(link).find('figcaption > h3').text().trim() ?? '';
            obj['type'] = 'series';
            
            // Get poster image
            const posterSrc = $(link).find('div.poster img').attr('src') ?? '';
            obj['posterImg'] = posterSrc.startsWith('http') ? posterSrc : `https:${posterSrc}`;
            
            // Try to extract episode number if available
            const episodeText = $(link).find('span.episode').text().trim();
            obj['episode'] = episodeText ? Number(episodeText.replace(/\D/g, '')) : 0;
            
            // Get rating
            obj['rating'] = $(link).find('span.rating span[itemprop="ratingValue"]').text().trim();
            
            obj['url'] = `${protocol}://${host}/series/${seriesId}`;
            obj['genres'] = genres;

            payload.push(obj);
        });

    return payload;
};

/**
 * Scrape series details asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<ISeriesDetails>} series details object
 */
export const scrapeSeriesDetails = async (
    req: Request,
    res: AxiosResponse
): Promise<ISeriesDetails> => {
    const { originalUrl, protocol, headers: { host } } = req;

    const $: cheerio.Root = cheerio.load(res.data);
    const obj = {} as ISeriesDetails;

    const genres: string[] = [];
    const directors: string[] = [];
    const countries: string[] = [];
    const casts: string[] = [];

    // Extract series ID from URL
    obj['_id'] = originalUrl.split('/').reverse()[0];
    obj['type'] = 'series';

    // Extract title from h1 tag
    const titleText = $('h1').first().text().trim();
    console.log('[SCRAPER DEBUG] Title raw:', titleText);
    
    // Clean up title - remove "Nonton Serial" prefix and "Sub Indo" suffix
    obj['title'] = titleText
        .replace(/^Nonton Serial\s*/i, '')
        .replace(/\s*Sub Indo$/i, '')
        .trim();
    console.log('[SCRAPER DEBUG] Title cleaned:', obj['title']);

    // Extract poster from meta tag or img
    const posterMeta = $('meta[property="og:image"]').attr('content');
    const posterImg = $('div.detail img').first().attr('src') || $('picture img').first().attr('src');
    console.log('[SCRAPER DEBUG] Poster meta:', posterMeta);
    console.log('[SCRAPER DEBUG] Poster img:', posterImg);
    obj['posterImg'] = posterMeta || (posterImg?.startsWith('http') ? posterImg : `https:${posterImg}`) || '';
    console.log('[SCRAPER DEBUG] Final poster:', obj['posterImg']);

    // Extract info tags (rating, date, status)
    const infoTags = $('div.info-tag span');
    if (infoTags.length > 0) {
        // Rating is usually in the first span with strong tag
        const ratingEl = $('div.info-tag span strong').first();
        obj['rating'] = ratingEl.text().trim();

        // Date and status from subsequent spans
        infoTags.each((i, el) => {
            const text = $(el).text().trim();
            // Date format: dd.mm.yyyy
            if (/^\d{2}\.\d{2}\.\d{4}$/.test(text)) {
                obj['releaseDate'] = text;
            }
            // Status: Ongoing, Complete, etc.
            else if (/^(Ongoing|Complete|Completed|End|Ended)$/i.test(text)) {
                obj['status'] = text.toLowerCase();
            }
        });
    }

    // Extract genres and countries from tag-list
    $('div.tag-list a, span.tag a').each((i, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        
        if (href.includes('/genre/')) {
            genres.push(text);
        } else if (href.includes('/country/')) {
            countries.push(text);
        }
    });

    // Extract synopsis from .synopsis div with data-full attribute
    const synopsisEl = $('div.synopsis');
    const synopsisFull = synopsisEl.attr('data-full');
    const synopsisText = synopsisFull || synopsisEl.text().trim();
    obj['synopsis'] = synopsisText.replace('Lihat selengkapnya', '').trim();
    console.log('[SCRAPER DEBUG] Synopsis length:', obj['synopsis'].length);

    // Extract trailer URL from YouTube lightbox button
    const trailerBtn = $('a.yt-lightbox').first();
    obj['trailerUrl'] = trailerBtn.attr('href') || '';

    // Directors and casts - try multiple selectors
    // First, try the old structure with div.detail p
    $('div.detail p').each((i, el) => {
        const label = $(el).find('span').first().text().trim().toLowerCase();
        
        if (label.includes('sutradara')) {
            $(el).find('a').each((j, a) => {
                directors.push($(a).text().trim());
            });
        } else if (label.includes('bintang') || label.includes('cast')) {
            $(el).find('a').each((j, a) => {
                casts.push($(a).text().trim());
            });
        } else if (label.includes('negara')) {
            $(el).find('a').each((j, a) => {
                const country = $(a).text().trim();
                if (!countries.includes(country)) {
                    countries.push(country);
                }
            });
        }
    });
    
    // Also look for links with specific href patterns
    $('a[href*="/director/"]').each((i, el) => {
        const director = $(el).text().trim();
        if (director && !directors.includes(director)) {
            directors.push(director);
        }
    });
    
    $('a[href*="/artist/"], a[href*="/actor/"], a[href*="/cast/"]').each((i, el) => {
        const actor = $(el).text().trim();
        if (actor && !casts.includes(actor)) {
            casts.push(actor);
        }
    });
    
    $('a[href*="/country/"]').each((i, el) => {
        const country = $(el).text().trim();
        if (country && !countries.includes(country)) {
            countries.push(country);
        }
    });

    // Duration - might not be available for series
    obj['duration'] = '';

    // Extract episode count from current selector or buttons
    let totalEpisodes = 0;
    
    // Try to get episode count from the episode list
    const episodeLinks = $('ul.episode-list li a, div.episode-list a, a.btn-primary');
    totalEpisodes = episodeLinks.length;
    
    // Get latest episode info
    const latestEpisodeLink = $('a[href*="-episode-"]').first().attr('href');
    if (latestEpisodeLink) {
        obj['latestEpisodeUrl'] = latestEpisodeLink;
    }

    // Build seasons array with episodes
    const seasons: ISeasonsList[] = [];
    
    // Check for season selector
    const seasonSelector = $('select.season-select option');
    
    if (seasonSelector.length > 0) {
        // Multiple seasons
        seasonSelector.each((i, el) => {
            const seasonNum = parseInt($(el).attr('value') || '1', 10);
            const episodes: IEpisode[] = [];
            
            // Get episodes for this season
            $(`ul.episode-list[data-season="${seasonNum}"] li a, div.episode-list a`).each((j, ep) => {
                const href = $(ep).attr('href') || '';
                const epId = href.split('/').filter(Boolean).pop() || '';
                const epText = $(ep).text().trim();
                const epNum = parseInt(epText.replace(/\D/g, ''), 10) || (j + 1);
                
                episodes.push({
                    _id: epId,
                    episode: epNum,
                    url: `${protocol}://${host}/series/episode/${epId}`
                });
            });
            
            seasons.push({
                season: seasonNum,
                totalEpisodes: episodes.length,
                episodes
            });
        });
    } else {
        // Single season - get all episode buttons from episode-list
        const episodes: IEpisode[] = [];
        const epElements = $('.episode-list a, a[href*="-episode-"]');
        
        epElements.each((i, el) => {
            const href = $(el).attr('href') || '';
            const epId = href.split('/').filter(Boolean).pop() || '';
            const epText = $(el).text().trim();
            const epNum = parseInt(epText.replace(/\D/g, ''), 10) || (i + 1);
            
            // Only add if it looks like an episode link
            if (href.includes('-episode-') || epText.match(/^\d+$/)) {
                episodes.push({
                    _id: epId,
                    episode: epNum,
                    url: `${protocol}://${host}/series/episode/${epId}`
                });
            }
        });
        
        if (episodes.length > 0) {
            seasons.push({
                season: 1,
                totalEpisodes: episodes.length,
                episodes
            });
        }
    }
    
    // Count total episodes for the obj.episode property
    obj['episode'] = seasons.reduce((acc, s) => acc + s.totalEpisodes, 0) || totalEpisodes;

    obj['genres'] = genres;
    obj['directors'] = directors;
    obj['countries'] = countries;
    obj['casts'] = casts;
    obj['seasons'] = seasons;

    console.log('[SCRAPER DEBUG] Final object:', {
        _id: obj['_id'],
        title: obj['title'],
        posterImg: obj['posterImg']?.substring(0, 50) + '...',
        rating: obj['rating'],
        releaseDate: obj['releaseDate'],
        status: obj['status'],
        genresCount: genres.length,
        directorsCount: directors.length,
        countriesCount: countries.length,
        castsCount: casts.length,
        seasonsCount: seasons.length,
        episodeCount: obj['episode']
    });

    return obj;
};

/**
 * Scrape episode details with streaming URLs
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<object>} episode details with video servers
 */
export const scrapeEpisodeDetails = async (
    req: Request,
    res: AxiosResponse
): Promise<{
    _id: string;
    title: string;
    episode: number;
    season: number;
    posterImg: string;
    videoServers: { server: string; url: string }[];
}> => {
    const { originalUrl } = req;

    const $: cheerio.Root = cheerio.load(res.data);
    
    // Extract episode ID from URL
    const episodeId = originalUrl.split('/').reverse()[0];
    
    // Extract title
    const titleText = $('h1').first().text().trim();
    
    // Try to extract season and episode numbers from URL or title
    const seasonMatch = episodeId.match(/season-(\d+)/i);
    const episodeMatch = episodeId.match(/episode-(\d+)/i);
    
    const season = seasonMatch ? parseInt(seasonMatch[1], 10) : 1;
    const episode = episodeMatch ? parseInt(episodeMatch[1], 10) : 1;

    // Get poster
    const posterMeta = $('meta[property="og:image"]').attr('content');
    const posterImg = $('div.detail img').first().attr('src') || $('picture img').first().attr('src');
    
    // Extract video server URLs from player section
    const videoServers: { server: string; url: string }[] = [];
    
    // Look for player iframe links
    $('a[href*="playeriframe"], a[href*="embed"], a.server-item, div.player-list a').each((i, el) => {
        const serverName = $(el).text().trim() || `Server ${i + 1}`;
        const serverUrl = $(el).attr('href') || '';
        
        if (serverUrl && !videoServers.some(v => v.url === serverUrl)) {
            videoServers.push({
                server: serverName,
                url: serverUrl
            });
        }
    });
    
    // Also check for active player iframe
    const activeIframe = $('iframe').first().attr('src');
    if (activeIframe && !videoServers.some(v => v.url === activeIframe)) {
        videoServers.unshift({
            server: 'Default',
            url: activeIframe
        });
    }

    return {
        _id: episodeId,
        title: titleText
            .replace(/^Nonton\s*/i, '')
            .replace(/\s*Sub Indo$/i, '')
            .trim(),
        episode,
        season,
        posterImg: posterMeta || (posterImg?.startsWith('http') ? posterImg : `https:${posterImg}`) || '',
        videoServers
    };
};
