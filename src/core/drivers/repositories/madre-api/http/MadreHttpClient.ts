import axios, { AxiosInstance, AxiosError } from 'axios';
import * as http from 'node:http';
import * as https from 'node:https';
import { MadreHttpError } from './errors/MadreHttpError';

type RequestOptions = {
  headers?: Record<string, string>;
};

export class MadreHttpClient {
  private readonly client: AxiosInstance;

  constructor() {
    const baseURL = process.env.MADRE_API_BASE_URL;

    if (!baseURL) {
      throw new Error('MADRE_API_BASE_URL is not defined');
    }

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      // Some upstreams close idle keep-alive sockets aggressively. Using
      // explicit non-keepalive agents avoids reusing a broken socket and
      // prevents intermittent EPIPE/ECONNRESET on follow-up requests.
      httpAgent: new http.Agent({ keepAlive: false }),
      httpsAgent: new https.Agent({ keepAlive: false }),
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*'
      }
    });
  }

  async get<T>(url: string, params?: any, options?: RequestOptions): Promise<T> {
    try {
      const response = await this.client.get<T>(url, {
        params,
        headers: options?.headers
      });
      return response.data;
    } catch (error) {
      throw this.handleError('GET', url, error);
    }
  }

  async post<T>(url: string, body: any, options?: RequestOptions): Promise<T> {
    try {
      const response = await this.client.post<T>(url, body, {
        headers: options?.headers
      });
      return response.data;
    } catch (error) {
      throw this.handleError('POST', url, error);
    }
  }

  async put<T>(url: string, body: any): Promise<T> {
    try {
      const response = await this.client.put<T>(url, body);
      return response.data;
    } catch (error) {
      throw this.handleError('PUT', url, error);
    }
  }

  async patch<T>(url: string, body: any): Promise<T> {
    try {
      const response = await this.client.patch<T>(url, body);
      return response.data;
    } catch (error) {
      throw this.handleError('PATCH', url, error);
    }
  }

  private handleError(method: string, url: string, error: unknown): MadreHttpError {
    const err = error as AxiosError;

    if (err.response) {
      return new MadreHttpError(err.response.status, err.response.data, `[MADRE ${method}] ${url}`);
    }

    return new MadreHttpError(
      500,
      {
        message: err.message,
        code: err.code,
        baseURL: this.client.defaults.baseURL,
        url
      },
      `[MADRE ${method}] ${url}`
    );
  }
}
