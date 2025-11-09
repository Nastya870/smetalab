import axiosInstance from 'utils/axiosInstance';

/**
 * Transform snake_case keys to camelCase (for compatibility with old code)
 */
const toCamelCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    acc[camelKey] = toCamelCase(obj[key]);
    return acc;
  }, {});
};

/**
 * Projects API Client
 * 
 * Provides methods for CRUD operations on projects and team management
 * Uses axiosInstance which automatically includes JWT token from AuthContext
 */
export const projectsAPI = {
  /**
   * Get all projects with pagination, search, and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (1-based)
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search term (searches across name, objectName, client, contractor, address)
   * @param {string} params.status - Filter by status (planning|active|completed|on_hold)
   * @param {string} params.startDateFrom - Filter by start date from
   * @param {string} params.startDateTo - Filter by start date to
   * @param {string} params.endDateFrom - Filter by end date from
   * @param {string} params.endDateTo - Filter by end date to
   * @param {string} params.sortBy - Sort field (default: created_at)
   * @param {string} params.sortOrder - Sort order (ASC|DESC, default: DESC)
   * @returns {Promise} Response with data array and pagination metadata
   */
  getAll: (params = {}) => {
    return axiosInstance.get('/projects', { params }).then((res) => {
      // Трансформируем данные из snake_case в camelCase
      const data = toCamelCase(res.data.data || []);
      return {
        ...res.data,
        data: data
      };
    });
  },

  /**
   * Get project statistics
   * @returns {Promise} Statistics object with counts and totals
   */
  getStats: () => {
    return axiosInstance.get('/projects/stats').then((res) => res.data);
  },

  /**
   * Get total profit from all projects' estimates
   * @returns {Promise} Total profit calculation
   */
  getTotalProfit: () => {
    return axiosInstance.get('/projects/total-profit').then((res) => res.data);
  },

  /**
   * Get total income from works (client acts) across all projects
   * @returns {Promise} Total income from works
   */
  getTotalIncomeWorks: () => {
    return axiosInstance.get('/projects/total-income-works').then((res) => res.data);
  },

  /**
   * Get total income from materials (estimate totals) across all projects
   * @returns {Promise} Total income from materials
   */
  getTotalIncomeMaterials: () => {
    return axiosInstance.get('/projects/total-income-materials').then((res) => res.data);
  },

  /**
   * Get projects with profit/loss data for popular projects card
   * @param {number} limit - Number of projects to return (default: 5)
   * @returns {Promise} Array of projects with profit/loss data
   */
  getProjectsProfitData: (limit = 5) => {
    return axiosInstance.get(`/projects/profit-data?limit=${limit}`).then((res) => res.data);
  },

  /**
   * Get monthly growth data for total growth chart
   * @returns {Promise} Monthly data for income/expense categories
   */
  getMonthlyGrowthData: () => {
    return axiosInstance.get('/projects/monthly-growth-data').then((res) => res.data);
  },

  /**
   * Get projects chart data by periods
   * @param {string} period - 'month' or 'year' 
   * @returns {Promise} Chart data with active/total projects by periods
   */
  getChartData: (period = 'year') => {
    return axiosInstance.get('/projects/chart-data', { params: { period } }).then((res) => res.data);
  },

  /**
   * Get project by ID with team details
   * @param {string} id - Project UUID
   * @returns {Promise} Project object with team members
   */
  getById: (id) => {
    return axiosInstance.get(`/projects/${id}`).then((res) => toCamelCase(res.data.data));
  },

  /**
   * Create new project
   * @param {Object} data - Project data
   * @param {string} data.objectName - Name of the construction object (required)
   * @param {string} data.client - Client name (required)
   * @param {string} data.contractor - Contractor name (required)
   * @param {string} data.address - Project address (required)
   * @param {string} data.startDate - Start date YYYY-MM-DD (required)
   * @param {string} data.endDate - End date YYYY-MM-DD (required)
   * @param {string} data.name - Project name (optional, defaults to objectName)
   * @param {string} data.description - Project description (optional)
   * @param {string} data.status - Status (planning|active|completed|on_hold, default: planning)
   * @param {number} data.progress - Progress percentage 0-100 (default: 0)
   * @param {number} data.budget - Budget amount (optional)
   * @param {number} data.actualCost - Actual cost (optional)
   * @param {string} data.managerId - Manager user UUID (optional)
   * @returns {Promise} Created project object
   */
  create: (data) => {
    return axiosInstance.post('/projects', data).then((res) => res.data);
  },

  /**
   * Update project by ID
   * @param {string} id - Project UUID
   * @param {Object} data - Fields to update (all optional)
   * @returns {Promise} Updated project object
   */
  update: (id, data) => {
    return axiosInstance.put(`/projects/${id}`, data).then((res) => res.data);
  },

  /**
   * Update project status only (fast endpoint)
   * @param {string} id - Project UUID
   * @param {string} status - New status (planning|approval|in_progress|rejected|completed)
   * @returns {Promise} Updated project object
   */
  updateStatus: (id, status) => {
    return axiosInstance.patch(`/projects/${id}/status`, { status }).then((res) => res.data);
  },

  /**
   * Delete project by ID (CASCADE deletes team members)
   * @param {string} id - Project UUID
   * @returns {Promise} Success message
   */
  delete: (id) => {
    return axiosInstance.delete(`/projects/${id}`).then((res) => res.data);
  },

  /**
   * Get project team members
   * @param {string} id - Project UUID
   * @param {boolean} includeLeft - Include members who left (default: false)
   * @returns {Promise} Array of team members
   */
  getTeam: (id, includeLeft = false) => {
    return axiosInstance.get(`/projects/${id}/team`, { params: { includeLeft } }).then((res) => res.data);
  },

  /**
   * Add team member to project
   * @param {string} id - Project UUID
   * @param {Object} data - Team member data
   * @param {string} data.userId - User UUID (required)
   * @param {string} data.role - Role (manager|member|viewer, default: member)
   * @param {boolean} data.canEdit - Can edit project (default: true for manager/member, false for viewer)
   * @param {boolean} data.canViewFinancials - Can view financials (default: true for manager, false for others)
   * @returns {Promise} Created team member object
   */
  addTeamMember: (id, data) => {
    return axiosInstance.post(`/projects/${id}/team`, data).then((res) => res.data);
  },

  /**
   * Update team member role and permissions
   * @param {string} id - Project UUID
   * @param {string} memberId - Team member ID
   * @param {Object} data - Fields to update
   * @param {string} data.role - New role (optional)
   * @param {boolean} data.canEdit - Update edit permission (optional)
   * @param {boolean} data.canViewFinancials - Update financials permission (optional)
   * @returns {Promise} Updated team member object
   */
  updateTeamMember: (id, memberId, data) => {
    return axiosInstance.put(`/projects/${id}/team/${memberId}`, data).then((res) => res.data);
  },

  /**
   * Remove team member from project (soft delete with left_at timestamp)
   * @param {string} id - Project UUID
   * @param {string} memberId - Team member ID
   * @returns {Promise} Success message
   */
  removeTeamMember: (id, memberId) => {
    return axiosInstance.delete(`/projects/${id}/team/${memberId}`).then((res) => res.data);
  },

  /**
   * Calculate project progress automatically based on completed works
   * @param {string} id - Project UUID
   * @returns {Promise} Object with progress, completedWorks, totalWorks
   */
  calculateProgress: (id) => {
    return axiosInstance.post(`/projects/${id}/calculate-progress`).then((res) => res.data);
  }
};

export default projectsAPI;
