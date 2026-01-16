import axiosInstance from '../axiosInstance';

const categoriesAPI = {
    /**
     * Получить список всех категорий
     * @param {Object} params - { type: 'material' | 'work' }
     */
    getAll: async (params = {}) => {
        const response = await axiosInstance.get('/categories', { params });
        return response.data; // { success, count, data: [] }
    }
};

export default categoriesAPI;
