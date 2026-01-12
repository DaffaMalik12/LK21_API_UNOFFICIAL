import axios from 'axios';
import { Request, Response } from 'express';
import cheerio from 'cheerio';

type TController = (req: Request, res: Response) => Promise<void>;

/**
 * Debug controller to test HTML scraping
 * @param {Request} req
 * @param {Response} res
 */
export const debugScraper: TController = async (req, res) => {
    try {
        const { id } = req.params;
        const url = `${process.env.ND_URL}/${id}`;

        console.log('[DEBUG] Fetching URL:', url);

        const axiosRequest = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        console.log('[DEBUG] Response status:', axiosRequest.status);
        console.log('[DEBUG] Response data length:', axiosRequest.data.length);

        const $: cheerio.Root = cheerio.load(axiosRequest.data);

        // Test all selectors
        const debug = {
            url,
            responseStatus: axiosRequest.status,
            htmlLength: axiosRequest.data.length,
            selectors: {
                h1: {
                    found: $('h1').length > 0,
                    text: $('h1').first().text().trim().substring(0, 100)
                },
                posterMeta: {
                    found: $('meta[property="og:image"]').length > 0,
                    content: $('meta[property="og:image"]').attr('content') || ''
                },
                posterImg: {
                    foundDetailImg: $('div.detail img').length > 0,
                    foundPictureImg: $('picture img').length > 0,
                    src: $('div.detail img').first().attr('src') || $('picture img').first().attr('src') || ''
                },
                infoTags: {
                    found: $('div.info-tag span').length > 0,
                    count: $('div.info-tag span').length,
                    texts: $('div.info-tag span').map((i, el) => $(el).text().trim()).get()
                },
                synopsis: {
                    found: $('div.synopsis').length > 0,
                    length: $('div.synopsis').text().trim().length,
                    preview: $('div.synopsis').text().trim().substring(0, 100)
                },
                genres: {
                    found: $('a[href*="/genre/"]').length > 0,
                    count: $('a[href*="/genre/"]').length,
                    values: $('a[href*="/genre/"]').map((i, el) => $(el).text().trim()).get()
                },
                countries: {
                    found: $('a[href*="/country/"]').length > 0,
                    count: $('a[href*="/country/"]').length,
                    values: $('a[href*="/country/"]').map((i, el) => $(el).text().trim()).get()
                },
                directors: {
                    found: $('a[href*="/director/"]').length > 0,
                    count: $('a[href*="/director/"]').length,
                    values: $('a[href*="/director/"]').map((i, el) => $(el).text().trim()).get()
                },
                casts: {
                    found: $('a[href*="/artist/"]').length > 0,
                    count: $('a[href*="/artist/"]').length,
                    values: $('a[href*="/artist/"]').map((i, el) => $(el).text().trim()).get()
                },
                episodes: {
                    foundEpisodeList: $('.episode-list a').length > 0,
                    foundEpisodeLinks: $('a[href*="-episode-"]').length > 0,
                    count: $('.episode-list a').length || $('a[href*="-episode-"]').length,
                    hrefs: $('.episode-list a, a[href*="-episode-"]').map((i, el) => $(el).attr('href')).get().slice(0, 5)
                }
            },
            // Include first 1000 chars of HTML for inspection
            htmlPreview: axiosRequest.data.substring(0, 1000)
        };

        res.status(200).json(debug);
    } catch (err: any) {
        console.error('[DEBUG ERROR]', err.message);
        res.status(400).json({
            error: err.message,
            stack: err.stack
        });
    }
};
