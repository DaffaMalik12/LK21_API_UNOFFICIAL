const cloudscraper = require('cloudscraper');
import { NextFunction as Next, Request, Response } from 'express';
import { scrapeMovieDetails, scrapeMovies } from '@/scrapers/movie';

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
 * Controller for `/movies` route
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
export const latestMovies: TController = async (req, res) => {
    try {
        const { page = 0 } = req.query;

        const url = `${process.env.LK21_URL}/latest${
            Number(page) > 1 ? `/page/${page}` : ''
        }`;

        const html = await fetchWithCloudscraper(url);
        const payload = await scrapeMovies(req, { data: html } as any);

        res.status(200).json(payload);
    } catch (err) {
        console.error(err);

        res.status(400).json(null);
    }
};

/**
 * Controller for `/popular/movies` route
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
export const popularMovies: TController = async (req, res) => {
    try {
        const { page = 0 } = req.query;

        const url = `${process.env.LK21_URL}/populer${
            Number(page) > 1 ? `/page/${page}` : ''
        }`;

        const html = await fetchWithCloudscraper(url);
        const payload = await scrapeMovies(req, { data: html } as any);

        res.status(200).json(payload);
    } catch (err) {
        console.error(err);

        res.status(400).json(null);
    }
};

/**
 * Controller for `/recent-release/movies` route
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
export const recentReleaseMovies: TController = async (req, res) => {
    try {
        const { page = 0 } = req.query;

        const url = `${process.env.LK21_URL}/release${
            Number(page) > 1 ? `/page/${page}` : ''
        }`;

        const html = await fetchWithCloudscraper(url);
        const payload = await scrapeMovies(req, { data: html } as any);

        res.status(200).json(payload);
    } catch (err) {
        console.error(err);

        res.status(400).json(null);
    }
};

/**
 * Controller for `/top-rated/movies` route
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
export const topRatedMovies: TController = async (req, res) => {
    try {
        const { page = 0 } = req.query;

        const url = `${process.env.LK21_URL}/rating${
            Number(page) > 1 ? `/page/${page}` : ''
        }`;

        const html = await fetchWithCloudscraper(url);
        const payload = await scrapeMovies(req, { data: html } as any);

        res.status(200).json(payload);
    } catch (err) {
        console.error(err);

        res.status(400).json(null);
    }
};

/**
 * Controller for `/movies/{movieId}` route
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
export const movieDetails: TController = async (req, res) => {
    try {
        const { id } = req.params;

        const url = `${process.env.LK21_URL}/${id}`;
        const html = await fetchWithCloudscraper(url);
        const payload = await scrapeMovieDetails(req, { data: html } as any);

        res.status(200).json(payload);
    } catch (err) {
        console.error(err);

        res.status(400).json(null);
    }
};
