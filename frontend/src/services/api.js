import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token if present in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('riskshield_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if invalid
      localStorage.removeItem('riskshield_token');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data.access_token) {
      localStorage.setItem('riskshield_token', res.data.access_token);
      localStorage.setItem('riskshield_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('riskshield_token');
    localStorage.removeItem('riskshield_user');
  }
};

export const transactionsAPI = {
  list: async (params) => {
    const res = await api.get('/transactions', { params });
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/transactions/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/transactions', data);
    return res.data;
  }
};

export const riskAPI = {
  score: async (data) => {
    const res = await api.post('/risk/score', data);
    return res.data;
  },
  getScore: async (id) => {
    const res = await api.get(`/risk/${id}`);
    return res.data;
  }
};

export const investigationsAPI = {
  run: async (id) => {
    const res = await api.post(`/investigations/${id}`);
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/investigations/${id}`);
    return res.data;
  },
  list: async () => {
    const res = await api.get('/investigations');
    return res.data;
  }
};

export const alertsAPI = {
  list: async (status) => {
    const res = await api.get('/alerts', { params: { status_filter: status } });
    return res.data;
  },
  updateStatus: async (id, status) => {
    const res = await api.patch(`/alerts/${id}`, { status });
    return res.data;
  }
};

export const decisionsAPI = {
  submit: async (data) => {
    const res = await api.post('/decisions', data);
    return res.data;
  },
  list: async () => {
    const res = await api.get('/decisions');
    return res.data;
  }
};

export const auditAPI = {
  list: async (params) => {
    const res = await api.get('/audit-logs', { params });
    return res.data;
  }
};

export const analyticsAPI = {
  getOverview: async () => {
    const res = await api.get('/analytics/overview');
    return res.data;
  },
  getFraudTrend: async () => {
    const res = await api.get('/analytics/fraud-trend');
    return res.data;
  },
  getRiskDistribution: async () => {
    const res = await api.get('/analytics/risk-distribution');
    return res.data;
  },
  getPaymentMethods: async () => {
    const res = await api.get('/analytics/payment-methods');
    return res.data;
  },
  getMerchantCategories: async () => {
    const res = await api.get('/analytics/merchant-categories');
    return res.data;
  }
};

export const modelAPI = {
  getMetrics: async () => {
    const res = await api.get('/model/metrics');
    return res.data;
  },
  getFeatures: async () => {
    const res = await api.get('/model/features');
    return res.data;
  }
};

export const fraudAPI = {
  getClusters: async () => {
    const res = await api.get('/fraud/clusters');
    return res.data;
  },
  getSpikes: async () => {
    const res = await api.get('/fraud/spikes');
    return res.data;
  },
  getDevices: async () => {
    const res = await api.get('/fraud/devices');
    return res.data;
  }
};

export const demoAPI = {
  generate: async () => {
    const res = await api.post('/demo/generate');
    return res.data;
  },
  reset: async () => {
    const res = await api.post('/demo/reset');
    return res.data;
  },
  getScenarios: async () => {
    const res = await api.get('/demo/scenarios');
    return res.data;
  }
};

export default api;
