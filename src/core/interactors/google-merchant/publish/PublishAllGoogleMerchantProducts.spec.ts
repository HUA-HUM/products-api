import { GetGoogleMerchantActiveProductsRepository } from 'src/core/drivers/repositories/madre-api/google-merchant/GetGoogleMerchantActiveProductsRepository';
import { MadreGoogleMerchantActiveProduct } from 'src/core/entitis/madre-api/google-merchant/get/GoogleMerchantActiveProductsResponse';
import { CreateGoogleMerchantProductRequest } from 'src/core/entitis/marketplace-api/google-merchant/products/create/CreateGoogleMerchantProductRequest';
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

const buildService = (params: {
  create: jest.Mock;
  syncExecute: jest.Mock;
  exists?: jest.Mock;
  products?: MadreGoogleMerchantActiveProduct[];
}) =>
  new PublishAllGoogleMerchantProducts(
    {
      listActive: jest.fn().mockResolvedValue({
        items: params.products ?? [buildProduct()],
        limit: 50,
        offset: 0,
        count: params.products?.length ?? 1,
        total: params.products?.length ?? 1,
        hasNext: false,
        nextOffset: null
      }),
      getByAsin: jest.fn()
    },
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
  const previousRetryDelay = process.env.GOOGLE_MERCHANT_PUBLISH_RETRY_DELAY_MS;

  beforeEach(() => {
    process.env.GOOGLE_MERCHANT_PUBLISH_RETRY_DELAY_MS = '0';
  });

  afterAll(() => {
    process.env.GOOGLE_MERCHANT_PUBLISH_RETRY_DELAY_MS = previousRetryDelay;
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
    const service = buildService({ create, syncExecute, exists });

    const summary = await service.execute();

    expect(summary).toMatchObject({
      pagesProcessed: 1,
      itemsFetched: 1,
      published: {
        success: 1,
        failed: 0
      },
      skipped: {
        alreadyExists: 0
      },
      sync: {
        success: 1,
        failed: 0
      },
      hasNext: false,
      nextOffset: null,
      failures: [],
      syncFailures: [],
      skippedItems: []
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
    const service = buildService({ create, syncExecute });

    const summary = await service.execute();

    expect(summary.published).toEqual({
      success: 0,
      failed: 1
    });
    expect(summary.sync).toEqual({
      success: 0,
      failed: 0
    });
    expect(summary.failures).toEqual([
      {
        sku: 'B005C58VUY',
        error: '[MARKETPLACE POST] /internal/google-merchant/products | statusCode=400 | title is required',
        statusCode: 400,
        details: {
          message: 'title is required'
        }
      }
    ]);
    expect(syncExecute).not.toHaveBeenCalled();
  });

  it('retries transient Google Merchant upstream timeouts before failing the product', async () => {
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
    const service = buildService({ create, syncExecute });

    const summary = await service.execute();

    expect(create).toHaveBeenCalledTimes(2);
    expect(summary.published).toEqual({
      success: 1,
      failed: 0
    });
    expect(summary.sync).toEqual({
      success: 1,
      failed: 0
    });
    expect(summary.failures).toEqual([]);
    expect(syncExecute).toHaveBeenCalledTimes(1);
  });

  it('skips products that already exist in Madre sync-items', async () => {
    const create = jest.fn();
    const syncExecute = jest.fn();
    const exists = jest.fn().mockResolvedValue({ exists: true });
    const service = buildService({ create, syncExecute, exists });

    const summary = await service.execute();

    expect(summary.published).toEqual({
      success: 0,
      failed: 0
    });
    expect(summary.skipped).toEqual({
      alreadyExists: 1
    });
    expect(summary.skippedItems).toEqual([
      {
        sku: 'B005C58VUY',
        reason: 'PRODUCT_ALREADY_EXISTS'
      }
    ]);
    expect(exists).toHaveBeenCalledWith({
      marketplace: 'google-merchant',
      sellerSku: 'B005C58VUY'
    });
    expect(create).not.toHaveBeenCalled();
    expect(syncExecute).not.toHaveBeenCalled();
  });
});

describe('GetGoogleMerchantActiveProductsRepository', () => {
  const previousInternalApiKey = process.env.INTERNAL_API_KEY;

  beforeEach(() => {
    process.env.INTERNAL_API_KEY = 'test-key';
  });

  afterAll(() => {
    process.env.INTERNAL_API_KEY = previousInternalApiKey;
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
