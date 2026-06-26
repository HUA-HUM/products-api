import { GetGoogleMerchantActiveProductsRepository } from 'src/core/drivers/repositories/madre-api/google-merchant/GetGoogleMerchantActiveProductsRepository';
import { MadreGoogleMerchantActiveProduct } from 'src/core/entitis/madre-api/google-merchant/get/GoogleMerchantActiveProductsResponse';
import { CreateGoogleMerchantProductRequest } from 'src/core/entitis/marketplace-api/google-merchant/products/create/CreateGoogleMerchantProductRequest';
import { GoogleMerchantProductPublisher } from './GoogleMerchantProductPublisher';
import { PublishAllGoogleMerchantProducts } from './PublishAllGoogleMerchantProducts';

const buildProduct = (overrides: Partial<MadreGoogleMerchantActiveProduct> = {}): MadreGoogleMerchantActiveProduct => ({
  id: '694347',
  brand_id: '5861',
  brand_name: 'Thule',
  name: 'Yamaha New OEM AL.PROP 12 1/4 X 9 663-45956-01-00-1',
  images: ['41jV4M7gH+L.jpg', '51BdvMc4kjL.jpg'],
  description:
    'Brand new, genuine Yamaha Al.Prop 12 1/4 X 9. This is a factory original equipment part, not aftermarket.',
  price: '179.97',
  is_active: 1,
  in_stock: 1,
  asin: 'B005C58VUY',
  sale_price: '670700.28',
  features: '["SKU: 663-45956-01-00-1","Sold Each","Please verify your own fitment"]',
  categoryTree: [
    {
      name: 'Vehicles & Parts',
      catId: '888'
    },
    {
      name: 'Vehicle Parts & Accessories',
      catId: '999'
    }
  ],
  partNumber: '692',
  ...overrides
});

const buildPage = (params: {
  items?: MadreGoogleMerchantActiveProduct[];
  limit?: number;
  offset?: number;
  hasNext?: boolean;
  nextOffset?: number | null;
}) => ({
  items: params.items ?? [buildProduct()],
  limit: params.limit ?? 50,
  offset: params.offset ?? 0,
  count: params.items?.length ?? 1,
  total: params.items?.length ?? 1,
  hasNext: params.hasNext ?? false,
  nextOffset: params.nextOffset ?? null
});

const buildQueueingService = (params: { listActive?: jest.Mock; enqueueProducts?: jest.Mock }) =>
  new PublishAllGoogleMerchantProducts(
    {
      listActive: params.listActive ?? jest.fn().mockResolvedValue(buildPage({})),
      getByAsin: jest.fn()
    },
    {
      enqueueProducts:
        params.enqueueProducts ??
        jest.fn().mockImplementation(async items =>
          items.map(item => ({
            productId: item.product.id,
            sku: item.product.asin ?? item.product.id,
            jobId: `${item.runId}:${item.product.asin ?? item.product.id}`
          }))
        )
    }
  );

const buildPublisher = (params: { create: jest.Mock; syncExecute: jest.Mock; exists?: jest.Mock }) =>
  new GoogleMerchantProductPublisher(
    {
      exists: params.exists ?? jest.fn().mockResolvedValue({ exists: false })
    },
    {
      create: params.create
    },
    {
      execute: params.syncExecute
    }
  );

describe('PublishAllGoogleMerchantProducts', () => {
  const previousMadreFetchRetryDelay = process.env.GOOGLE_MERCHANT_MADRE_FETCH_RETRY_DELAY_MS;
  const previousMadreFetchMaxAttempts = process.env.GOOGLE_MERCHANT_MADRE_FETCH_MAX_ATTEMPTS;

  beforeEach(() => {
    process.env.GOOGLE_MERCHANT_MADRE_FETCH_RETRY_DELAY_MS = '0';
    process.env.GOOGLE_MERCHANT_MADRE_FETCH_MAX_ATTEMPTS = '3';
  });

  afterAll(() => {
    if (previousMadreFetchRetryDelay === undefined) {
      delete process.env.GOOGLE_MERCHANT_MADRE_FETCH_RETRY_DELAY_MS;
    } else {
      process.env.GOOGLE_MERCHANT_MADRE_FETCH_RETRY_DELAY_MS = previousMadreFetchRetryDelay;
    }

    if (previousMadreFetchMaxAttempts === undefined) {
      delete process.env.GOOGLE_MERCHANT_MADRE_FETCH_MAX_ATTEMPTS;
    } else {
      process.env.GOOGLE_MERCHANT_MADRE_FETCH_MAX_ATTEMPTS = previousMadreFetchMaxAttempts;
    }
  });

  it('fetches active Madre products and enqueues one BullMQ job per product', async () => {
    const product = buildProduct();
    const listActive = jest.fn().mockResolvedValue(buildPage({ items: [product] }));
    const enqueueProducts = jest.fn().mockResolvedValue([
      {
        productId: '694347',
        sku: 'B005C58VUY',
        jobId: 'run-1:B005C58VUY'
      }
    ]);
    const service = buildQueueingService({ listActive, enqueueProducts });

    const summary = await service.execute({ runId: 'run-1' });

    expect(listActive).toHaveBeenCalledWith(50, 0);
    expect(enqueueProducts).toHaveBeenCalledWith([
      {
        runId: 'run-1',
        product,
        page: 1,
        offset: 0,
        limit: 50
      }
    ]);
    expect(summary).toMatchObject({
      runId: 'run-1',
      mode: 'queued',
      pagesProcessed: 1,
      itemsFetched: 1,
      queued: {
        success: 1,
        failed: 0
      },
      published: {
        success: 0,
        failed: 0
      },
      sync: {
        success: 0,
        failed: 0
      },
      hasNext: false,
      nextOffset: null,
      queuedItems: [
        {
          productId: '694347',
          sku: 'B005C58VUY',
          jobId: 'run-1:B005C58VUY'
        }
      ],
      failures: [],
      enqueueFailures: [],
      pageFetchFailures: []
    });
  });

  it('retries transient Madre page fetch timeouts before enqueueing the page', async () => {
    const listActive = jest
      .fn()
      .mockRejectedValueOnce({
        message: '[MADRE GET] /internal/google-merchant/products/active',
        statusCode: 500,
        response: {
          message: 'timeout of 30000ms exceeded',
          code: 'ECONNABORTED'
        }
      })
      .mockResolvedValueOnce(buildPage({}));
    const enqueueProducts = jest.fn().mockResolvedValue([
      {
        productId: '694347',
        sku: 'B005C58VUY',
        jobId: 'run-2:B005C58VUY'
      }
    ]);
    const service = buildQueueingService({ listActive, enqueueProducts });

    const summary = await service.execute({ runId: 'run-2' });

    expect(listActive).toHaveBeenCalledTimes(2);
    expect(summary.pageFetchFailures).toEqual([]);
    expect(summary.queued).toEqual({
      success: 1,
      failed: 0
    });
  });

  it('returns a partial queue summary when Madre page fetch keeps failing after processed products', async () => {
    process.env.GOOGLE_MERCHANT_MADRE_FETCH_MAX_ATTEMPTS = '2';

    const listActive = jest
      .fn()
      .mockResolvedValueOnce(
        buildPage({
          hasNext: true,
          nextOffset: 50
        })
      )
      .mockRejectedValue({
        message: '[MADRE GET] /internal/google-merchant/products/active',
        statusCode: 500,
        response: {
          message: 'timeout of 30000ms exceeded',
          code: 'ECONNABORTED'
        }
      });
    const enqueueProducts = jest.fn().mockResolvedValue([
      {
        productId: '694347',
        sku: 'B005C58VUY',
        jobId: 'run-3:B005C58VUY'
      }
    ]);
    const service = buildQueueingService({ listActive, enqueueProducts });

    const summary = await service.execute({ runId: 'run-3' });

    expect(listActive).toHaveBeenCalledTimes(3);
    expect(summary).toMatchObject({
      pagesProcessed: 1,
      itemsFetched: 1,
      queued: {
        success: 1,
        failed: 0
      },
      hasNext: true,
      nextOffset: 50,
      pageFetchFailures: [
        {
          page: 2,
          offset: 50,
          limit: 50,
          error: '[MADRE GET] /internal/google-merchant/products/active',
          statusCode: 500,
          details: {
            message: 'timeout of 30000ms exceeded',
            code: 'ECONNABORTED'
          }
        }
      ]
    });
  });

  it('keeps enqueue failures in the HTTP summary without stopping the page', async () => {
    const product = buildProduct();
    const listActive = jest.fn().mockResolvedValue(buildPage({ items: [product] }));
    const enqueueProducts = jest.fn().mockRejectedValue(new Error('Redis unavailable'));
    const service = buildQueueingService({ listActive, enqueueProducts });

    const summary = await service.execute({ runId: 'run-4' });

    expect(summary.queued).toEqual({
      success: 0,
      failed: 1
    });
    expect(summary.enqueueFailures).toEqual([
      {
        productId: '694347',
        sku: 'B005C58VUY',
        error: 'Redis unavailable'
      }
    ]);
  });
});

describe('GoogleMerchantProductPublisher', () => {
  const previousRetryDelay = process.env.GOOGLE_MERCHANT_PUBLISH_RETRY_DELAY_MS;

  beforeEach(() => {
    process.env.GOOGLE_MERCHANT_PUBLISH_RETRY_DELAY_MS = '0';
  });

  afterAll(() => {
    if (previousRetryDelay === undefined) {
      delete process.env.GOOGLE_MERCHANT_PUBLISH_RETRY_DELAY_MS;
    } else {
      process.env.GOOGLE_MERCHANT_PUBLISH_RETRY_DELAY_MS = previousRetryDelay;
    }
  });

  it('maps active Madre products, publishes them and saves successful publications in sync-items', async () => {
    const create = jest.fn().mockResolvedValue({
      success: true,
      data: {
        name: 'accounts/123/products/online:es:AR:B005C58VUY',
        contentLanguage: 'es',
        feedLabel: 'AR'
      }
    });
    const syncExecute = jest.fn().mockResolvedValue(undefined);
    const exists = jest.fn().mockResolvedValue({ exists: false });
    const publisher = buildPublisher({ create, syncExecute, exists });

    const result = await publisher.execute(buildProduct());

    expect(result).toMatchObject({
      success: true,
      status: 'PUBLISHED',
      productId: '694347',
      sku: 'B005C58VUY',
      price: 670700.28,
      stock: 1,
      wasAlreadySynced: false
    });
    expect(exists).toHaveBeenCalledWith({
      marketplace: 'google-merchant',
      sellerSku: 'B005C58VUY'
    });

    expect(create).toHaveBeenCalledWith({
      sku: 'B005C58VUY',
      title: 'Yamaha New OEM AL.PROP 12 1/4 X 9 663-45956-01-00-1',
      description:
        'Brand new, genuine Yamaha Al.Prop 12 1/4 X 9. This is a factory original equipment part, not aftermarket.',
      price: 670700.28,
      stock: 1,
      brand: 'Thule',
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/41jV4M7gH+L.jpg',
      productUrl: 'https://loquieroaca.com/products/694347',
      additionalImageUrls: ['https://images-na.ssl-images-amazon.com/images/I/51BdvMc4kjL.jpg'],
      condition: 'new',
      googleProductCategory: 'Vehicles & Parts > Vehicle Parts & Accessories',
      mpn: '692',
      identifierExists: true,
      shipping: [
        {
          country: 'AR',
          service: 'Envio a domicilio',
          price: 0,
          minHandlingTime: 1,
          maxHandlingTime: 3,
          minTransitTime: 2,
          maxTransitTime: 10
        }
      ]
    } satisfies CreateGoogleMerchantProductRequest);

    expect(syncExecute).toHaveBeenCalledWith({
      marketplace: 'google-merchant',
      items: [
        {
          externalId: 'accounts/123/products/online:es:AR:B005C58VUY',
          sellerSku: 'B005C58VUY',
          marketplaceSku: 'B005C58VUY',
          price: 670700.28,
          stock: 1,
          status: 'ACTIVE',
          raw: {
            offerId: 'B005C58VUY',
            contentLanguage: 'es',
            feedLabel: 'AR',
            productId: '694347',
            request: expect.objectContaining({
              sku: 'B005C58VUY',
              productUrl: 'https://loquieroaca.com/products/694347',
              imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/41jV4M7gH+L.jpg',
              additionalImageUrls: ['https://images-na.ssl-images-amazon.com/images/I/51BdvMc4kjL.jpg'],
              googleProductCategory: 'Vehicles & Parts > Vehicle Parts & Accessories',
              mpn: '692'
            }),
            response: {
              name: 'accounts/123/products/online:es:AR:B005C58VUY',
              contentLanguage: 'es',
              feedLabel: 'AR'
            },
            publishedAt: expect.any(String)
          }
        }
      ]
    });
  });

  it('returns marketplace error details when publication fails', async () => {
    const create = jest.fn().mockResolvedValue({
      success: false,
      message: '[MARKETPLACE POST] /internal/google-merchant/products | statusCode=400 | title is required',
      statusCode: 400,
      details: {
        message: 'title is required'
      }
    });
    const syncExecute = jest.fn().mockResolvedValue(undefined);
    const publisher = buildPublisher({ create, syncExecute });

    const result = await publisher.execute(buildProduct());

    expect(result).toMatchObject({
      success: false,
      status: 'PUBLISH_ERROR',
      productId: '694347',
      sku: 'B005C58VUY',
      error: '[MARKETPLACE POST] /internal/google-merchant/products | statusCode=400 | title is required',
      retryable: false,
      statusCode: 400,
      details: {
        message: 'title is required'
      },
      payload: expect.objectContaining({
        sku: 'B005C58VUY'
      })
    });
    expect(syncExecute).not.toHaveBeenCalled();
  });

  it('retries transient Google Merchant upstream timeouts before succeeding the product', async () => {
    const create = jest
      .fn()
      .mockResolvedValueOnce({
        success: false,
        message:
          '[MARKETPLACE POST] /internal/google-merchant/products | statusCode=502 | Google Merchant rechazó la operación | timeout of 12000ms exceeded',
        statusCode: 502,
        details: {
          message: 'Google Merchant rechazó la operación',
          upstreamResponse: 'timeout of 12000ms exceeded'
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          name: 'accounts/123/products/online:es:AR:B005C58VUY',
          contentLanguage: 'es',
          feedLabel: 'AR'
        }
      });
    const syncExecute = jest.fn().mockResolvedValue(undefined);
    const publisher = buildPublisher({ create, syncExecute });

    const result = await publisher.execute(buildProduct());

    expect(create).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      success: true,
      status: 'PUBLISHED'
    });
    expect(syncExecute).toHaveBeenCalledTimes(1);
  });

  it('publishes products that already exist in Madre sync-items because Google insert is an upsert', async () => {
    const create = jest.fn().mockResolvedValue({
      success: true,
      data: {
        name: 'accounts/123/products/online:es:AR:B005C58VUY',
        contentLanguage: 'es',
        feedLabel: 'AR'
      }
    });
    const syncExecute = jest.fn().mockResolvedValue(undefined);
    const exists = jest.fn().mockResolvedValue({ exists: true });
    const publisher = buildPublisher({ create, syncExecute, exists });

    const result = await publisher.execute(buildProduct());

    expect(result).toMatchObject({
      success: true,
      status: 'PUBLISHED',
      productId: '694347',
      sku: 'B005C58VUY',
      wasAlreadySynced: true
    });
    expect(exists).toHaveBeenCalledWith({
      marketplace: 'google-merchant',
      sellerSku: 'B005C58VUY'
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(syncExecute).toHaveBeenCalledTimes(1);
  });
});

describe('GetGoogleMerchantActiveProductsRepository', () => {
  const previousInternalApiKey = process.env.INTERNAL_API_KEY;

  beforeEach(() => {
    process.env.INTERNAL_API_KEY = 'test-key';
  });

  afterAll(() => {
    if (previousInternalApiKey === undefined) {
      delete process.env.INTERNAL_API_KEY;
    } else {
      process.env.INTERNAL_API_KEY = previousInternalApiKey;
    }
  });

  it('normalizes raw Madre product lists into a paginated response', async () => {
    const httpClient = {
      get: jest.fn().mockResolvedValue([buildProduct(), buildProduct({ id: '2', asin: 'B000000002' })])
    };
    const repository = new GetGoogleMerchantActiveProductsRepository(httpClient as any);

    const response = await repository.listActive(2, 0);

    expect(httpClient.get).toHaveBeenCalledWith(
      '/internal/google-merchant/products/active',
      {
        limit: 2,
        offset: 0
      },
      {
        headers: {
          'x-internal-api-key': 'test-key'
        }
      }
    );
    expect(response).toMatchObject({
      items: expect.any(Array),
      limit: 2,
      offset: 0,
      count: 2,
      total: 2,
      hasNext: true,
      nextOffset: 2
    });
  });
});
