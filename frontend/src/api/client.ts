import {
  Plant,
  PlantCreateInput,
  Observation,
  Forecast,
  DashboardData,
  ModelStatus,
  ImageAnalysisResult,
  GrowthStage,
  CropCatalogItem,
  TelemetrySummaryResponse,
  TelemetryReading,
  PaginatedObservationResponse,
  WeatherComparisonResponse,
  User,
  AuthResponse,
  SignupResponse,
  CropAgronomyProfile,
  TrainingDatasetItem,
  PlantReportResponse,
  ChatMessage,
  ChatbotResponse,
  PlantAnalysisResponse,
  PlantProblemResponse,
  ProblemAnalysisResponse,
  DigitalTwinResponse,
  WhatIfRequest,
  WhatIfResponse,
  NextBestObservationData,
  TreatmentPlan,
  TreatmentActionItem,
  RecoveryObservationItem,
  GeometricAnalysisResult,
  DiseaseDatasetItem,
  DiseaseDatasetInferenceResponse,
} from '../types';

export const RAW_BASE = ((import.meta.env.VITE_API_BASE_URL as string) || '').replace(/\/$/, '');
const API_BASE = `${RAW_BASE}/api/v1`;

export function getAssetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${RAW_BASE}${cleanPath}`;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('plantpulse_token') || sessionStorage.getItem('plantpulse_token');
  }

  setToken(token: string | null, rememberMe: boolean = true) {
    this.token = token;
    if (token) {
      if (rememberMe) {
        localStorage.setItem('plantpulse_token', token);
        sessionStorage.removeItem('plantpulse_token');
      } else {
        sessionStorage.setItem('plantpulse_token', token);
        localStorage.removeItem('plantpulse_token');
      }
    } else {
      localStorage.removeItem('plantpulse_token');
      sessionStorage.removeItem('plantpulse_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('plantpulse_token') || sessionStorage.getItem('plantpulse_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorData = await response.json();
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((errItem: any) => {
              if (typeof errItem === 'string') return errItem;
              if (errItem.msg) return `${errItem.loc ? errItem.loc.slice(-1) + ': ' : ''}${errItem.msg}`;
              return JSON.stringify(errItem);
            })
            .join('; ');
        } else if (errorData.message && typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        } else if (errorData.detail) {
          errorMessage = JSON.stringify(errorData.detail);
        }
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Authentication operations
  async signup(data: {
    email: string;
    password: string;
    confirm_password?: string;
    full_name?: string;
    preferred_language?: string;
    terms_accepted?: boolean;
  }): Promise<SignupResponse> {
    const payload = {
      email: data.email,
      password: data.password,
      confirm_password: data.confirm_password || data.password,
      full_name: data.full_name || data.email.split('@')[0],
      preferred_language: data.preferred_language || 'en',
      terms_accepted: data.terms_accepted !== undefined ? data.terms_accepted : true,
    };
    return this.request<SignupResponse>('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async verifyEmail(data: { email: string; otp_code?: string; otp?: string }): Promise<{ message: string; verified: boolean }> {
    const otpValue = data.otp || data.otp_code || '';
    return this.request<{ message: string; verified: boolean }>('/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        otp: otpValue,
        otp_code: otpValue,
      }),
    });
  }

  async resendOtp(email: string): Promise<{ message: string; email: string }> {
    return this.request<{ message: string; email: string }>('/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  }

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async googleLogin(data: { id_token?: string; code?: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: { token: string; new_password: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateProfile(data: { full_name?: string; preferred_language?: string; voice_assistant_enabled?: boolean }): Promise<User> {
    return this.request<User>('/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: { current_password: string; new_password: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  // Plant operations
  async getPlants(options?: { cropType?: string; monitoredOnly?: boolean; includeDemo?: boolean }): Promise<Plant[]> {
    const params = new URLSearchParams();
    if (options?.cropType && options.cropType !== 'all') params.append('crop_type', options.cropType);
    if (options?.monitoredOnly !== undefined) params.append('monitored_only', options.monitoredOnly.toString());
    if (options?.includeDemo !== undefined) params.append('include_demo', options.includeDemo.toString());
    const query = params.toString();
    return this.request<Plant[]>(`/plants${query ? `?${query}` : ''}`);
  }

  async getPlant(id: string): Promise<Plant> {
    return this.request<Plant>(`/plants/${id}`);
  }

  async createPlant(data: PlantCreateInput): Promise<Plant> {
    return this.request<Plant>('/plants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async registerPlantWithPhoto(formData: FormData): Promise<Plant> {
    return this.request<Plant>('/plants/register', {
      method: 'POST',
      body: formData,
    });
  }

  async updatePlant(id: string, data: Partial<PlantCreateInput>): Promise<Plant> {
    return this.request<Plant>(`/plants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async deletePlant(id: string): Promise<{ message: string; id: string }> {
    return this.request<{ message: string; id: string }>(`/plants/${id}`, {
      method: 'DELETE',
    });
  }

  // Observation operations
  async getObservations(plantId: string): Promise<Observation[]> {
    return this.request<Observation[]>(`/plants/${plantId}/observations`);
  }

  async createObservation(plantId: string, formData: FormData): Promise<Observation> {
    return this.request<Observation>(`/plants/${plantId}/observations`, {
      method: 'POST',
      body: formData,
    });
  }

  async analyzeObservation(obsId: string): Promise<ImageAnalysisResult> {
    return this.request<ImageAnalysisResult>(`/observations/${obsId}/analyse`, {
      method: 'POST',
    });
  }

  async correctObservationStage(obsId: string, manualStage: GrowthStage | string): Promise<Observation> {
    return this.request<Observation>(`/observations/${obsId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manual_growth_stage: manualStage }),
    });
  }

  // Forecast operations
  async getForecast(plantId: string): Promise<Forecast> {
    return this.request<Forecast>(`/plants/${plantId}/forecast`);
  }

  async generateForecast(plantId: string): Promise<Forecast> {
    return this.request<Forecast>(`/plants/${plantId}/forecast`, {
      method: 'POST',
    });
  }

  async getForecastHistory(plantId: string): Promise<Forecast[]> {
    return this.request<Forecast[]>(`/plants/${plantId}/forecast/history`);
  }

  // Dashboard operations
  async getDashboard(includeDemo?: boolean): Promise<DashboardData> {
    const params = new URLSearchParams();
    if (includeDemo !== undefined) params.append('include_demo', includeDemo.toString());
    const query = params.toString();
    return this.request<DashboardData>(`/dashboard${query ? `?${query}` : ''}`);
  }

  async seedDemo(): Promise<{ message: string; plant_id: string }> {
    return this.request<{ message: string; plant_id: string }>('/dashboard/seed-demo', {
      method: 'POST',
    });
  }

  async resetDemo(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/dashboard/reset-demo', {
      method: 'POST',
    });
  }

  // Crop catalog operations
  async getCrops(): Promise<CropCatalogItem[]> {
    return this.request<CropCatalogItem[]>('/crops');
  }

  async getCrop(id: string): Promise<CropCatalogItem> {
    return this.request<CropCatalogItem>(`/crops/${id}`);
  }

  // Telemetry operations
  async getTelemetrySummary(
    range: string = '24h',
    plantId?: string,
    cropType?: string,
    source?: string,
    includeDemo?: boolean
  ): Promise<TelemetrySummaryResponse> {
    const params = new URLSearchParams({ range });
    if (plantId) params.append('plant_id', plantId);
    if (cropType && cropType !== 'all') params.append('crop_type', cropType);
    if (source && source !== 'ALL') params.append('data_source', source);
    if (includeDemo !== undefined) params.append('include_demo', includeDemo.toString());
    return this.request<TelemetrySummaryResponse>(`/telemetry/summary?${params.toString()}`);
  }

  async getTelemetryReadings(options?: {
    parameter?: string;
    range?: string;
    plantId?: string;
    cropType?: string;
    source?: string;
    limit?: number;
    includeDemo?: boolean;
  }): Promise<TelemetryReading[]> {
    const params = new URLSearchParams();
    if (options?.parameter) params.append('parameter', options.parameter);
    if (options?.range) params.append('range', options.range);
    if (options?.plantId) params.append('plant_id', options.plantId);
    if (options?.cropType && options.cropType !== 'all') params.append('crop_type', options.cropType);
    if (options?.source && options.source !== 'ALL') {
      params.append('data_source', options.source);
      params.append('source', options.source);
    }
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.includeDemo !== undefined) params.append('include_demo', options.includeDemo.toString());
    const query = params.toString();
    return this.request<TelemetryReading[]>(`/telemetry/readings${query ? `?${query}` : ''}`);
  }

  async recordTelemetry(data: {
    plant_id: string;
    parameter_name: string;
    value: number;
    unit: string;
    data_source?: string;
    timestamp?: string;
  }): Promise<TelemetryReading> {
    return this.request<TelemetryReading>('/telemetry/readings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getWeatherComparison(days: number = 7, location?: string): Promise<WeatherComparisonResponse> {
    const params = new URLSearchParams({ days: days.toString() });
    if (location) params.append('location', location);
    return this.request<WeatherComparisonResponse>(`/weather/comparison?${params.toString()}`);
  }

  // Observation stream operations
  async getAllObservations(options?: {
    page?: number;
    pageSize?: number;
    cropType?: string;
    plantId?: string;
    stage?: string;
    search?: string;
    includeDemo?: boolean;
  }): Promise<PaginatedObservationResponse> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('page_size', options.pageSize.toString());
    if (options?.cropType && options.cropType !== 'all') params.append('crop_type', options.cropType);
    if (options?.plantId) params.append('plant_id', options.plantId);
    if (options?.stage && options.stage !== 'all') params.append('stage', options.stage);
    if (options?.search) params.append('search', options.search);
    if (options?.includeDemo !== undefined) params.append('include_demo', options.includeDemo.toString());
    const query = params.toString();
    return this.request<PaginatedObservationResponse>(`/observations${query ? `?${query}` : ''}`);
  }

  async getObservation(id: string): Promise<Observation> {
    return this.request<Observation>(`/observations/${id}`);
  }

  // Dataset operations
  async getCropAgronomyProfiles(): Promise<CropAgronomyProfile[]> {
    return this.request<CropAgronomyProfile[]>('/datasets/crops');
  }

  async getCropAgronomyProfile(id: string): Promise<CropAgronomyProfile> {
    return this.request<CropAgronomyProfile>(`/datasets/crops/${id}`);
  }

  async getTrainingDatasets(): Promise<TrainingDatasetItem[]> {
    return this.request<TrainingDatasetItem[]>('/datasets/training');
  }

  async getPlantReport(plantId: string): Promise<PlantReportResponse> {
    return this.request<PlantReportResponse>(`/datasets/reports/${plantId}`);
  }

  // Chatbot operations
  async sendChatMessage(message: string, plantId?: string): Promise<ChatbotResponse> {
    return this.request<ChatbotResponse>('/chatbot/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, plant_id: plantId || null }),
    });
  }

  async getChatHistory(): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>('/chatbot/history');
  }

  async clearChatHistory(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/chatbot/history', {
      method: 'DELETE',
    });
  }

  // Model & System operations
  async getModelStatus(): Promise<ModelStatus> {
    return this.request<ModelStatus>('/models/status');
  }

  // ================= Advanced Plant Analysis & Growth Intelligence API =================

  async analysePlant(
    plantId: string,
    options?: { observationId?: string; manualStage?: string; image?: File }
  ): Promise<PlantAnalysisResponse> {
    if (options?.image) {
      const formData = new FormData();
      formData.append('image', options.image);
      if (options.observationId) formData.append('observation_id', options.observationId);
      if (options.manualStage) formData.append('manual_stage', options.manualStage);
      return this.request<PlantAnalysisResponse>(`/plants/${plantId}/analyse`, {
        method: 'POST',
        body: formData,
      });
    }

    const formData = new FormData();
    if (options?.observationId) formData.append('observation_id', options.observationId);
    if (options?.manualStage) formData.append('manual_stage', options.manualStage);

    return this.request<PlantAnalysisResponse>(`/plants/${plantId}/analyse`, {
      method: 'POST',
      body: formData,
    });
  }

  async getPlantAnalyses(plantId: string): Promise<PlantAnalysisResponse[]> {
    return this.request<PlantAnalysisResponse[]>(`/plants/${plantId}/analyses`);
  }

  async getAnalysis(analysisId: string): Promise<PlantAnalysisResponse> {
    return this.request<PlantAnalysisResponse>(`/analyses/${analysisId}`);
  }

  async submitAnalysisFeedback(
    analysisId: string,
    feedback: string,
    notes?: string
  ): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(`/analyses/${analysisId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback, notes }),
    });
  }

  // Farmer Problem Reporting & Agronomic Diagnosis
  async reportPlantProblem(plantId: string, formData: FormData): Promise<PlantProblemResponse> {
    return this.request<PlantProblemResponse>(`/plants/${plantId}/problems`, {
      method: 'POST',
      body: formData,
    });
  }

  async getPlantProblems(plantId: string): Promise<PlantProblemResponse[]> {
    return this.request<PlantProblemResponse[]>(`/plants/${plantId}/problems`);
  }

  async reanalyzeProblem(problemId: string): Promise<ProblemAnalysisResponse> {
    return this.request<ProblemAnalysisResponse>(`/problems/${problemId}/analyse`, {
      method: 'POST',
    });
  }

  // Plant Digital Twin & Growth Deviation Radar
  async getDigitalTwin(plantId: string): Promise<DigitalTwinResponse> {
    return this.request<DigitalTwinResponse>(`/plants/${plantId}/digital-twin`);
  }

  async simulateWhatIf(plantId: string, scenario: WhatIfRequest): Promise<WhatIfResponse> {
    return this.request<WhatIfResponse>(`/plants/${plantId}/what-if`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario),
    });
  }

  async getNextObservation(plantId: string): Promise<NextBestObservationData> {
    return this.request<NextBestObservationData>(`/plants/${plantId}/next-observation`);
  }

  // Treatment & Recovery Plans
  async getLatestTreatment(): Promise<TreatmentPlan | null> {
    return this.request<TreatmentPlan | null>('/treatments/latest');
  }

  async getPlantTreatment(plantId: string): Promise<TreatmentPlan | null> {
    return this.request<TreatmentPlan | null>(`/plants/${plantId}/treatment`);
  }

  async updateTreatmentAction(treatmentId: string, actionId: string, isCompleted: boolean): Promise<TreatmentActionItem> {
    return this.request<TreatmentActionItem>(`/treatments/${treatmentId}/actions/${actionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: isCompleted }),
    });
  }

  async addRecoveryFollowUp(treatmentId: string, formData: FormData): Promise<RecoveryObservationItem> {
    return this.request<RecoveryObservationItem>(`/treatments/${treatmentId}/follow-up`, {
      method: 'POST',
      body: formData,
    });
  }

  // Geometric Anomaly Inspector
  async runGeometricAnalysis(plantId: string, formData?: FormData): Promise<GeometricAnalysisResult> {
    return this.request<GeometricAnalysisResult>(`/plants/${plantId}/geometric-analysis`, {
      method: 'POST',
      body: formData,
    });
  }

  async getPlantGeometricAnalyses(plantId: string): Promise<GeometricAnalysisResult[]> {
    return this.request<GeometricAnalysisResult[]>(`/plants/${plantId}/geometric-analyses`);
  }

  // Disease Dataset Gallery & Live Inference
  async getDiseaseDatasets(crop?: string, condition?: string): Promise<DiseaseDatasetItem[]> {
    const params = new URLSearchParams();
    if (crop) params.append('crop', crop);
    if (condition) params.append('condition', condition);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<DiseaseDatasetItem[]>(`/disease-datasets${qs}`);
  }

  async tryDiseaseDatasetImage(datasetId: string): Promise<DiseaseDatasetInferenceResponse> {
    return this.request<DiseaseDatasetInferenceResponse>(`/disease-datasets/${datasetId}/try`, {
      method: 'POST',
    });
  }

  async checkHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${RAW_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  }
}

export const api = new ApiClient();
