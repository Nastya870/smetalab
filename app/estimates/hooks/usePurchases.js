import { useState, useEffect, useCallback } from 'react';
import * as purchasesAPI from 'api/purchases';
import * as globalPurchasesAPI from 'api/globalPurchases';
import materialsAPI from 'api/materials';

export const usePurchases = (estimateId, projectId) => {
    const [loading, setLoading] = useState(false);
    const [purchasesGenerated, setPurchasesGenerated] = useState(false);
    const [purchasesData, setPurchasesData] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [totalActualAmount, setTotalActualAmount] = useState(0);

    // Состояние диалогов
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addExtraMaterialDialogOpen, setAddExtraMaterialDialogOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);

    // Состояние форм
    const [purchaseForm, setPurchaseForm] = useState({
        quantity: '',
        purchasePrice: '',
        purchaseDate: new Date().toISOString().split('T')[0]
    });

    const [extraMaterialForm, setExtraMaterialForm] = useState({
        material: null,
        quantity: '',
        purchasePrice: ''
    });

    const [materials, setMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Загрузка данных
    const fetchPurchases = useCallback(async () => {
        setLoading(true);
        try {
            const response = await purchasesAPI.getByEstimateId(estimateId);
            const purchases = Array.isArray(response) ? response : (response?.purchases || []);

            if (purchases.length > 0) {
                setPurchasesData(purchases);
                setPurchasesGenerated(true);

                // Расчет итогов
                const total = purchases.reduce((sum, item) => sum + (item.total || 0), 0);
                const actual = purchases.reduce((sum, item) => sum + (item.actualTotalPrice || 0), 0);
                setTotalAmount(total);
                setTotalActualAmount(actual);
            } else {
                setPurchasesGenerated(false);
            }
        } catch (err) {
            console.error('Ошибка при загрузке закупок:', err);
            setError('Не удалось загрузить данные закупок');
        } finally {
            setLoading(false);
        }
    }, [estimateId]);

    useEffect(() => {
        fetchPurchases();
    }, [fetchPurchases]);

    const handleGeneratePurchases = async () => {
        setLoading(true);
        try {
            await purchasesAPI.generatePurchases(estimateId, projectId);
            await fetchPurchases();
        } catch (err) {
            console.error('Ошибка при генерации закупок:', err);
            setError('Не удалось сформировать закупки');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAddDialog = (material) => {
        setSelectedMaterial(material);
        setPurchaseForm({
            quantity: (material.quantity - (material.purchasedQuantity || 0)).toString(),
            purchasePrice: material.price.toString(),
            purchaseDate: new Date().toISOString().split('T')[0]
        });
        setAddDialogOpen(true);
    };

    const handleCloseAddDialog = () => {
        setAddDialogOpen(false);
        setSelectedMaterial(null);
        setError(null);
    };

    const handleOpenExtraMaterialDialog = async () => {
        setAddExtraMaterialDialogOpen(true);
        setLoadingMaterials(true);
        try {
            const response = await materialsAPI.getAllMaterials();
            setMaterials(response || []);
        } catch (err) {
            console.error('Ошибка при загрузке материалов:', err);
            setError('Не удалось загрузить список материалов');
        } finally {
            setLoadingMaterials(false);
        }
    };

    const handleCloseExtraMaterialDialog = () => {
        setAddExtraMaterialDialogOpen(false);
        setExtraMaterialForm({ material: null, quantity: '', purchasePrice: '' });
        setError(null);
    };

    const handleAddToGlobalPurchases = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const payload = {
                projectId,
                estimateId,
                materialId: selectedMaterial.materialId || selectedMaterial.id,
                purchaseQuantity: parseFloat(purchaseForm.quantity),
                purchasePrice: parseFloat(purchaseForm.purchasePrice),
                purchaseDate: purchaseForm.purchaseDate,
                isExtraCharge: selectedMaterial.isExtraCharge || false,
                estimateMaterialId: selectedMaterial.id
            };

            await globalPurchasesAPI.createGlobalPurchase(payload);
            handleCloseAddDialog();
            await fetchPurchases();
        } catch (err) {
            console.error('Ошибка при добавлении закупки:', err);
            setError('Ошибка при сохранении данных');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddExtraMaterial = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const payload = {
                projectId,
                estimateId,
                materialId: extraMaterialForm.material.id,
                purchaseQuantity: parseFloat(extraMaterialForm.quantity),
                purchasePrice: parseFloat(extraMaterialForm.purchasePrice),
                purchaseDate: new Date().toISOString().split('T')[0],
                isExtraCharge: true
            };

            await globalPurchasesAPI.createGlobalPurchase(payload);
            handleCloseExtraMaterialDialog();
            await fetchPurchases();
        } catch (err) {
            console.error('Ошибка при добавлении отдельного чека:', err);
            setError('Ошибка при сохранении данных');
        } finally {
            setSubmitting(false);
        }
    };

    const getPurchaseStatus = (material) => {
        const purchased = material.purchasedQuantity || 0;
        if (purchased === 0) return 'none';
        if (purchased >= material.quantity) return 'complete';
        if (purchased > 0) return 'partial';
        return 'none';
    };

    const regularMaterials = purchasesData.filter(m => !m.isExtraCharge);
    const extraMaterials = purchasesData.filter(m => m.isExtraCharge);

    return {
        loading,
        purchasesGenerated,
        regularMaterials,
        extraMaterials,
        totalAmount,
        totalActualAmount,
        addDialogOpen,
        addExtraMaterialDialogOpen,
        selectedMaterial,
        purchaseForm,
        setPurchaseForm,
        extraMaterialForm,
        setExtraMaterialForm,
        materials,
        loadingMaterials,
        submitting,
        error,
        handleGeneratePurchases,
        handleOpenAddDialog,
        handleCloseAddDialog,
        handleOpenExtraMaterialDialog,
        handleCloseExtraMaterialDialog,
        handleAddToGlobalPurchases,
        handleAddExtraMaterial,
        getPurchaseStatus
    };
};
