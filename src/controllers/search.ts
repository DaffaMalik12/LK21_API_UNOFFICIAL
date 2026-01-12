const cloudscraper = require('cloudscraper');
import { NextFunction as Next, Request, Response } from 'express';
import { scrapeSearchedMoviesOrSeries } from '@/scrapers/search';

type TController = (req: Request, res: Response, next?: Next) => Promise<void>;

// Helper function to wrap cloudscraper in a Promise
const fetchWithCloudscraper = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        cloudscraper.get(url, (error: any, response: any, body: string) => {
            if (error) {
                reject(error);
            } else {
                resolve(body);
            }
        });
    });
};

/**
 * Controller for /search/:title` route
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
export const searchedMoviesOrSeries: TController = async (req, res) => {
    try {
        const { title = '' } = req.params;

        const url = `${process.env.LK21_URL}/?s=${title}`;
        const html = await fetchWithCloudscraper(url);

        const payload = await scrapeSearchedMoviesOrSeries(req, { data: html } as any);

        res.status(200).json(payload);
    } catch (err) {
        console.error(err);

        res.status(400).json(null);
    }
};
