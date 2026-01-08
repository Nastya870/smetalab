import { useState, useEffect, useCallback, useRef, useDeferredValue } from 'react';
import estimatesAPI from 'api/estimates';
import workMaterialsAPI from 'api/workMaterials';
import worksAPI from 'api/works';
import { useNotifications } from 'contexts/NotificationsContext';

// ==============================|| HELPERS ||============================== //

const compareWorkItems = (a, b) => {
    const phaseA = a.phase || 'Без фазы';
    const phaseB = b.phase || 'Без фазы';
    if (phaseA !== phaseB) return phaseA.localeCompare(phaseB, 'ru');

    const codeA = a.code || '';
    const codeB = b.code || '';

    if (codeA && codeB) {
        const partsA = codeA.split(/[-.]/);
        const partsB = codeB.split(/[-.]/);
        const prefixA = parseInt(partsA[0]) || 0;
        const prefixB = parseInt(partsB[0]) || 0;
        if (prefixA !== prefixB) return prefixA - prefixB;
        if (partsA.length > 1 && partsB.length > 1) {
            const numA = parseInt(partsA[1]) || 0;
            const numB = parseInt(partsB[1]) || 0;
            if (numA !== numB) return numA - numB;
        }
        return codeA.localeCompare(codeB, 'ru');
    }

    const sectionA = a.section || '';
    const sectionB = b.section || '';
    if (sectionA !== sectionB) return sectionA.localeCompare(sectionB, 'ru');

    const subsectionA = a.subsection || '';
    const subsectionB = b.subsection || '';
    return subsectionA.localeCompare(subsectionB, 'ru');
};

const sortWorkItems = (items) => {
    items.sort((a, b) => compareWorkItems(a, b));
};

// ==============================|| HOOK ||============================== //

const useEstimateData = ({ projectId, estimateId, onUnsavedChanges }) => {
    const { success, error: showError, info, warning } = useNotifications();

    // -- State --
    const [estimateData, setEstimateData] = useState({ sections: [] });
    const deferredEstimateData = useDeferredValue(estimateData);

    const [estimateMetadata, setEstimateMetadata] = useState({
        name: `Смета от ${new Date().toLocaleDateString()}`,
        estimateType: 'строительство',
        status: 'draft',
        description: `Смета создана в конструкторе смет`,
        estimateDate: new Date().toISOString().split('T')[0],
        currency: 'RUB'
    });

    const [originalPrices, setOriginalPrices] = useState(new Map());
    const [currentCoefficient, setCurrentCoefficient] = useState(0);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // -- Refs --
    const savedEstimateDataRef = useRef(null);
    const isInitialLoadRef = useRef(false);
    const onUnsavedChangesRef = useRef(onUnsavedChanges);

    useEffect(() => {
        onUnsavedChangesRef.current = onUnsavedChanges;
    }, [onUnsavedChanges]);

    // -- Helpers for state updates --

    const saveOriginalPrices = useCallback((sections) => {
        setOriginalPrices(prev => {
            const newMap = new Map(prev);
            sections.forEach(section => {
                section.items.forEach(item => {
                    const key = item.workId || `${item.code}_${item.name}`;
                    if (!newMap.has(key)) {
                        newMap.set(key, item.price);
                    }
                });
            });
            return newMap;
        });
    }, []);

    // -- LOAD --

    useEffect(() => {
        const loadSavedEstimate = async () => {
            const estimateIdToLoad = estimateId || localStorage.getItem('currentEstimateId');
            if (!estimateIdToLoad) return;

            isInitialLoadRef.current = false;

            try {
                setLoading(true);
                isInitialLoadRef.current = true;
                console.log('🔄 Loading estimate:', estimateIdToLoad);

                const estimate = await estimatesAPI.getById(estimateIdToLoad);

                if (projectId && estimate.project_id !== projectId) {
                    localStorage.removeItem('currentEstimateId');
                    setLoading(false);
                    return;
                }

                setEstimateMetadata({
                    name: estimate.name || `Смета от ${new Date(estimate.created_at).toLocaleDateString()}`,
                    estimateType: estimate.estimate_type || estimate.estimateType || 'строительство',
                    status: estimate.status || 'draft',
                    description: estimate.description || '',
                    estimateDate: estimate.estimate_date || estimate.estimateDate || new Date().toISOString().split('T')[0],
                    currency: estimate.currency || 'RUB'
                });

                const projectData = {
                    clientName: estimate.client_name || '',
                    contractorName: estimate.contractor_name || '',
                    objectAddress: estimate.object_address || '',
                    contractNumber: estimate.contract_number || '',
                };

                const sections = [];

                estimate.items.forEach((item) => {
                    const phaseKey = item.phase || 'Без фазы';
                    const sectionCode = item.code ? item.code.split(/[-–]/)[0] : '00';

                    let section = sections.find(s => s.title === phaseKey);
                    if (!section) {
                        section = {
                            id: `s${sectionCode}-${Date.now()}`,
                            code: sectionCode,
                            title: phaseKey,
                            name: phaseKey,
                            items: [],
                            subtotal: 0
                        };
                        sections.push(section);
                    }

                    section.items.push({
                        id: item.id || `item-${Date.now()}-${Math.random()}`,
                        workId: item.work_id || item.id,
                        code: item.code,
                        name: item.name,
                        description: item.description,
                        unit: item.unit,
                        quantity: item.quantity,
                        price: item.unit_price,
                        total: item.final_price || parseFloat((item.quantity * item.unit_price).toFixed(2)),
                        phase: item.phase,
                        section: item.section,
                        subsection: item.subsection,
                        materials: (item.materials || []).map(m => ({
                            id: m.material_id || `mat-${Date.now()}-${Math.random()}`,
                            material_id: m.material_id, // keep real ID
                            sku: m.sku,
                            name: m.material_name,
                            unit: m.unit,
                            quantity: m.quantity,
                            price: m.unit_price || m.price,
                            total: m.total || parseFloat((m.quantity * (m.unit_price || m.price || 0)).toFixed(2)),
                            consumption: m.consumption_coefficient || m.consumption,
                            auto_calculate: m.auto_calculate ?? m.autoCalculate ?? true,
                            autoCalculate: m.auto_calculate ?? m.autoCalculate ?? true,
                            is_required: m.is_required,
                            notes: m.notes,
                            image: m.image || null,
                            showImage: m.image ? true : false
                        }))
                    });
                });

                sections.forEach(section => {
                    sortWorkItems(section.items);
                    section.subtotal = section.items.reduce((sum, item) => sum + (item.total || 0), 0);
                });

                sections.sort((a, b) => {
                    const codeA = a.code || '00';
                    const codeB = b.code || '00';
                    return codeA.localeCompare(codeB);
                });

                setEstimateData({
                    sections,
                    ...projectData
                });

                // Initialize original prices from loaded data
                // Assuming loaded prices ARE original unless we store them separately?
                // The component logic assumes "first seen" is original.
                saveOriginalPrices(sections);

                savedEstimateDataRef.current = JSON.stringify({ sections, ...projectData });
                setHasUnsavedChanges(false);
                if (onUnsavedChangesRef.current) {
                    onUnsavedChangesRef.current(false);
                }

                setIsInitialLoadComplete(true);
                info(`Смета "${estimate.name}" загружена из БД`);

            } catch (error) {
                console.error('Error auto-loading estimate:', error);
                if (error.response?.status === 404) {
                    localStorage.removeItem('currentEstimateId');
                }
            } finally {
                setLoading(false);
            }
        };

        if (!isInitialLoadRef.current) {
            loadSavedEstimate();
        }
    }, [estimateId, projectId, info, saveOriginalPrices]);

    // -- ACTIONS --

    const addWorks = useCallback(async (worksToAdd) => {
        if (!worksToAdd || worksToAdd.length === 0) return;

        try {
            const workIds = worksToAdd.map(w => w.id);
            const materialsMap = await workMaterialsAPI.getMaterialsForMultipleWorks(workIds);

            const worksWithMaterials = worksToAdd.map(work => ({
                work,
                materials: materialsMap[work.id] || []
            }));

            setEstimateData((prevData) => {
                const newSections = prevData.sections.map(section => ({
                    ...section,
                    items: [...section.items]
                }));

                worksWithMaterials.forEach(({ work, materials }) => {
                    const phaseKey = work.phase || 'Без фазы';
                    const sectionCode = work.code ? work.code.split(/[-–]/)[0] : '00';

                    let sectionIndex = newSections.findIndex((s) => s.title === phaseKey);

                    if (sectionIndex === -1) {
                        newSections.push({
                            id: `s${sectionCode}-${Date.now()}`,
                            code: sectionCode,
                            title: phaseKey,
                            name: phaseKey,
                            items: [],
                            subtotal: 0
                        });
                        sectionIndex = newSections.length - 1;
                    }

                    const defaultQuantity = 0;
                    const calculatedMaterials = materials.map((mat) => ({
                        id: `${mat.material_id}-${Date.now()}-${Math.random()}`,
                        material_id: mat.material_id,
                        code: mat.material_sku || `M-${mat.material_id}`,
                        name: mat.material_name,
                        unit: mat.material_unit,
                        quantity: parseFloat((defaultQuantity * mat.consumption).toFixed(2)),
                        price: mat.material_price,
                        total: parseFloat((defaultQuantity * mat.consumption * mat.material_price).toFixed(2)),
                        consumption: parseFloat(mat.consumption),
                        auto_calculate: true,
                        autoCalculate: true,
                        showImage: mat.show_image !== undefined ? mat.show_image : true
                    }));

                    const newItem = {
                        id: `item-${Date.now()}-${work.id}`,
                        workId: work.id,
                        code: work.code,
                        name: work.name,
                        unit: work.unit,
                        quantity: defaultQuantity,
                        price: work.price,
                        total: defaultQuantity * work.price,
                        phase: work.phase,
                        section: work.section,
                        subsection: work.subsection,
                        materials: calculatedMaterials
                    };

                    newSections[sectionIndex].items.push(newItem);
                    sortWorkItems(newSections[sectionIndex].items);

                    newSections[sectionIndex].subtotal = newSections[sectionIndex].items.reduce(
                        (sum, item) => sum + item.total, 0
                    );
                });

                // Sort sections
                newSections.sort((a, b) => {
                    const codeA = a.code || '00';
                    const codeB = b.code || '00';
                    return codeA.localeCompare(codeB);
                });

                saveOriginalPrices(newSections);
                return { ...prevData, sections: newSections };
            });

            setHasUnsavedChanges(true);

        } catch (error) {
            console.error(error);
            showError('Ошибка добавления работ');
        }
    }, [saveOriginalPrices, showError]);

    const updateWorkQuantity = useCallback((sectionIndex, itemIndex, newQuantity) => {
        if (newQuantity === '' || newQuantity === null || newQuantity === undefined) {
            setEstimateData((prevData) => {
                const newSections = [...prevData.sections];
                const section = { ...newSections[sectionIndex] };
                section.items = [...section.items];

                const item = { ...section.items[itemIndex], quantity: 0, total: 0 };

                if (item.materials && item.materials.length > 0) {
                    item.materials = item.materials.map(m => {
                        const isAuto = m.auto_calculate ?? m.autoCalculate ?? true;
                        return isAuto ? { ...m, quantity: 0, total: 0 } : { ...m, total: 0 };
                    });
                }
                section.items[itemIndex] = item;
                section.subtotal = section.items.reduce((s, i) => s + i.total, 0);
                newSections[sectionIndex] = section;
                return { ...prevData, sections: newSections };
            });
            return;
        }

        const quantity = parseFloat(newQuantity);
        if (isNaN(quantity) || quantity < 0) return;

        setEstimateData((prevData) => {
            const newSections = prevData.sections.map((section, secIdx) => {
                if (secIdx !== sectionIndex) return section;

                const newItems = section.items.map((item, itIdx) => {
                    if (itIdx !== itemIndex) return item;

                    const newItem = {
                        ...item,
                        quantity: quantity,
                        total: quantity * item.price
                    };

                    if (newItem.materials && newItem.materials.length > 0) {
                        newItem.materials = newItem.materials.map(m => {
                            const isAuto = m.auto_calculate ?? m.autoCalculate ?? true;
                            if (isAuto) {
                                const calculatedQty = quantity * (m.consumption || 0);
                                const newMatQty = Math.ceil(calculatedQty);
                                return {
                                    ...m,
                                    quantity: newMatQty,
                                    total: parseFloat((newMatQty * m.price).toFixed(2))
                                };
                            }
                            return {
                                ...m,
                                total: parseFloat((m.quantity * m.price).toFixed(2))
                            };
                        });
                    }
                    return newItem;
                });

                const newSubtotal = newItems.reduce((s, i) => s + i.total, 0);
                return { ...section, items: newItems, subtotal: newSubtotal };
            });
            return { ...prevData, sections: newSections };
        });
        setHasUnsavedChanges(true);
    }, []);

    const updateWorkPrice = useCallback((sectionIndex, itemIndex, newPrice) => {
        setEstimateData((prevData) => {
            const newSections = prevData.sections.map((section, secIdx) => {
                if (secIdx !== sectionIndex) return section;

                const newItems = section.items.map((item, itIdx) => {
                    if (itIdx !== itemIndex) return item;
                    const newTotal = parseFloat((item.quantity * newPrice).toFixed(2));
                    return { ...item, price: newPrice, total: newTotal };
                });

                const newSubtotal = newItems.reduce((s, i) => s + i.total, 0);
                return { ...section, items: newItems, subtotal: newSubtotal };
            });
            return { ...prevData, sections: newSections };
        });
        setHasUnsavedChanges(true);
    }, []);

    const removeWorkItem = useCallback((sectionIndex, itemIndex) => {
        if (!window.confirm('Удалить эту работу?')) return;

        setEstimateData(prevData => {
            const newSections = [...prevData.sections];
            const section = { ...newSections[sectionIndex] };
            section.items = [...section.items];
            section.items.splice(itemIndex, 1);

            if (section.items.length === 0) {
                newSections.splice(sectionIndex, 1);
            } else {
                section.subtotal = section.items.reduce((s, i) => s + i.total, 0);
                newSections[sectionIndex] = section;
            }
            return { ...prevData, sections: newSections };
        });
        setHasUnsavedChanges(true);
    }, []);

    const addMaterialToWork = useCallback((sectionIndex, itemIndex, material) => {
        setEstimateData((prevData) => {
            const newSections = [...prevData.sections];
            const section = { ...newSections[sectionIndex] };
            section.items = [...section.items];
            const item = { ...section.items[itemIndex] };

            const rawConsumption = material.consumption || material.consumption_coefficient || 1.0;
            const materialConsumption = Math.ceil(rawConsumption * 10) / 10;

            const autoCalculate = material.auto_calculate ?? material.autoCalculate ?? true;

            const calculatedQuantity = autoCalculate
                ? Math.ceil(item.quantity * materialConsumption)
                : materialConsumption;

            const newMaterial = {
                id: `${material.id}-${Date.now()}-${Math.random()}`,
                material_id: material.id,
                code: material.sku || `M-${material.id}`,
                name: material.name,
                unit: material.unit,
                quantity: calculatedQuantity,
                price: material.price,
                total: parseFloat((calculatedQuantity * material.price).toFixed(2)),
                consumption: materialConsumption,
                auto_calculate: autoCalculate,
                autoCalculate: autoCalculate,
                image: material.image || null,
                showImage: material.image ? true : false
            };

            item.materials = [...(item.materials || []), newMaterial];

            section.items[itemIndex] = item;
            newSections[sectionIndex] = section;
            // Note: subtotal doesn't change when adding material?
            // Usually not, material cost is separate or part of work?
            // In existing logic, work.total is quantity * price.
            // Material cost is usually extra or included.
            // Current calculate logic: work total is work price * work qty.
            // Material total is mat price * mat qty.
            // Section subtotal is sum of work totals.
            // Does section subtotal include material totals?
            // Reading logic: section.items.reduce((sum, item) => sum + item.total, 0).
            // So NO. Material cost is NOT in subtotal currently. 
            // This matches existing logic.
            return { ...prevData, sections: newSections };
        });
        success(`Материал "${material.name}" добавлен`);
        setHasUnsavedChanges(true);
    }, [success]);

    const replaceMaterial = useCallback((sectionIndex, itemIndex, materialIndex, newMaterial) => {
        setEstimateData((prevData) => {
            const newSections = prevData.sections.map((section, sIdx) => {
                if (sIdx !== sectionIndex) return section;
                return {
                    ...section,
                    items: section.items.map((item, iIdx) => {
                        if (iIdx !== itemIndex) return item;

                        const oldMaterial = item.materials[materialIndex];
                        const updatedMaterial = {
                            id: `${newMaterial.id}-${Date.now()}-${Math.random()}`,
                            material_id: newMaterial.id,
                            code: newMaterial.sku || `M-${newMaterial.id}`,
                            name: newMaterial.name,
                            unit: newMaterial.unit,
                            quantity: oldMaterial.quantity,
                            price: newMaterial.price,
                            total: parseFloat((oldMaterial.quantity * newMaterial.price).toFixed(2)),
                            consumption: oldMaterial.consumption,
                            image: newMaterial.image || null,
                            showImage: newMaterial.image ? true : false
                        };

                        const newMaterials = [...item.materials];
                        newMaterials[materialIndex] = updatedMaterial;
                        return { ...item, materials: newMaterials };
                    })
                };
            });
            return { ...prevData, sections: newSections };
        });
        setHasUnsavedChanges(true);
    }, []);

    const removeMaterial = useCallback((sectionIndex, itemIndex, materialIndex) => {
        if (!window.confirm('Удалить этот материал?')) return;
        setEstimateData((prevData) => {
            const newSections = prevData.sections.map((section, sIdx) => {
                if (sIdx !== sectionIndex) return section;
                return {
                    ...section,
                    items: section.items.map((item, iIdx) => {
                        if (iIdx !== itemIndex) return item;
                        const newMaterials = [...item.materials];
                        newMaterials.splice(materialIndex, 1);
                        return { ...item, materials: newMaterials };
                    })
                };
            });
            return { ...prevData, sections: newSections };
        });
        setHasUnsavedChanges(true);
    }, []);

    const updateMaterialConsumption = useCallback((sectionIndex, itemIndex, materialIndex, consumption) => {
        const newCons = parseFloat(String(consumption).replace(/,/g, '.'));
        if (isNaN(newCons) || newCons < 0) return;

        setEstimateData((prevData) => {
            const newSections = prevData.sections.map((section, sIdx) => {
                if (sIdx !== sectionIndex) return section;
                return {
                    ...section,
                    items: section.items.map((item, iIdx) => {
                        if (iIdx !== itemIndex) return item;

                        const newMaterials = item.materials.map((mat, mIdx) => {
                            if (mIdx !== materialIndex) return mat;

                            const isAuto = mat.auto_calculate ?? mat.autoCalculate ?? true;
                            const newQuantity = isAuto
                                ? parseFloat((item.quantity * newCons).toFixed(2))
                                : mat.quantity;

                            return {
                                ...mat,
                                consumption: newCons,
                                quantity: newQuantity,
                                total: parseFloat((newQuantity * mat.price).toFixed(2))
                            };
                        });
                        return { ...item, materials: newMaterials };
                    })
                };
            });
            return { ...prevData, sections: newSections };
        });
        setHasUnsavedChanges(true);
    }, []);

    const updateMaterialQuantity = useCallback((sectionIndex, itemIndex, materialIndex, newQuantity) => {
        const quantity = parseFloat(String(newQuantity).replace(/,/g, '.'));
        if (isNaN(quantity) || quantity < 0) return;

        setEstimateData((prevData) => {
            const newSections = prevData.sections.map((section, sIdx) => {
                if (sIdx !== sectionIndex) return section;
                return {
                    ...section,
                    items: section.items.map((item, iIdx) => {
                        if (iIdx !== itemIndex) return item;

                        const newMaterials = item.materials.map((mat, mIdx) => {
                            if (mIdx !== materialIndex) return mat;
                            return {
                                ...mat,
                                quantity: quantity,
                                auto_calculate: false,
                                autoCalculate: false,
                                total: parseFloat((quantity * mat.price).toFixed(2))
                            };
                        });
                        return { ...item, materials: newMaterials };
                    })
                };
            });
            return { ...prevData, sections: newSections };
        });
        setHasUnsavedChanges(true);
    }, []);

    const save = useCallback(async () => {
        try {
            setSaving(true);
            const items = [];
            estimateData.sections.forEach(section => {
                section.items.forEach(item => {
                    items.push({
                        workId: item.workId,
                        code: item.code,
                        name: item.name,
                        description: item.description,
                        unit: item.unit,
                        quantity: parseFloat(item.quantity) || 0,
                        unit_price: parseFloat(item.price) || 0,
                        final_price: item.total || 0,
                        phase: item.phase,
                        section: item.section,
                        subsection: item.subsection,
                        overhead_percent: 0,
                        profit_percent: 0,
                        tax_percent: 0,
                        is_optional: false,
                        notes: '',
                        materials: item.materials
                            .filter(m => m.material_id && parseFloat(m.quantity) > 0)
                            .map(m => ({
                                material_id: m.material_id,
                                quantity: parseFloat(m.quantity),
                                unit_price: parseFloat(m.price) || 0,
                                consumption: parseFloat(m.consumption) || 1.0,
                                auto_calculate: m.auto_calculate ?? m.autoCalculate ?? true,
                                is_required: m.is_required !== false,
                                notes: m.notes || ''
                            }))
                    });
                });
            });

            const estimatePayload = {
                name: estimateMetadata.name,
                projectId: projectId,
                estimateType: estimateMetadata.estimateType,
                status: estimateMetadata.status,
                description: estimateMetadata.description,
                estimateDate: estimateMetadata.estimateDate,
                currency: estimateMetadata.currency,
                clientName: estimateData.clientName || '',
                contractorName: estimateData.contractorName || '',
                objectAddress: estimateData.objectAddress || '',
                contractNumber: estimateData.contractNumber || '',
                items: items
            };

            let savedEstimate;
            if (estimateId) {
                savedEstimate = await estimatesAPI.updateWithItems(estimateId, estimatePayload);
                success(`Смета успешно обновлена! ID: ${savedEstimate.id}`);
            } else {
                savedEstimate = await estimatesAPI.create(estimatePayload);
                success(`Смета успешно создана! ID: ${savedEstimate.id}`);
                localStorage.setItem('currentEstimateId', savedEstimate.id);
            }

            savedEstimateDataRef.current = JSON.stringify(estimateData);
            setHasUnsavedChanges(false);
            if (onUnsavedChangesRef.current) {
                onUnsavedChangesRef.current(false);
            }
        } catch (error) {
            console.error('Error saving estimate:', error);
            showError('Ошибка сохранения', error.response?.data?.error || error.message);
        } finally {
            setSaving(false);
        }
    }, [estimateData, estimateMetadata, estimateId, projectId, success, showError]);

    const updateMetadata = useCallback((field, value) => {
        setEstimateMetadata(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    }, []);

    const updateProjectData = useCallback((field, value) => {
        setEstimateData(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    }, []);

    const clearEstimate = useCallback(() => {
        setEstimateData({ sections: [] });
        setHasUnsavedChanges(true);
    }, []);

    // Coefficient Logic
    const applyCoefficient = useCallback((coefficientPercent) => {
        const multiplier = 1 + (coefficientPercent / 100);
        setEstimateData((prevData) => {
            const newSections = prevData.sections.map((section) => {
                const updatedItems = section.items.map((item) => {
                    const key = item.workId || `${item.code}_${item.name}`;
                    // Get original price directly from state since we can't access it in callback easily?
                    // Actually we can if we put originalPrices in dependency but that causes re-renders.
                    // Or we access originalPrices from closure.
                    // Ideally we should use functional update but we need access to originalPrices.
                    // Since originalPrices updates rarely, adding it to dependency is OK.
                    const originalPrice = originalPrices.get(key) || item.price;

                    // We must ensure original prices are saved if missing
                    if (!originalPrices.has(key)) {
                        // Side effect in render? No, this is event handler.
                        // We should ideally update originalPrices too, but we are inside setEstimateData...
                        // We can't update another state here.
                        // So we assume originalPrices are up to date.
                    }

                    const newPrice = parseFloat((originalPrice * multiplier).toFixed(2));
                    return {
                        ...item,
                        price: newPrice,
                        total: parseFloat((item.quantity * newPrice).toFixed(2))
                    };
                });

                const newSubtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
                return { ...section, items: updatedItems, subtotal: newSubtotal };
            });
            return { ...prevData, sections: newSections };
        });
        setCurrentCoefficient(coefficientPercent);
        success(`Коэффициент ${coefficientPercent > 0 ? '+' : ''}${coefficientPercent}% применен`);
    }, [originalPrices, success]); // Depends on originalPrices

    const resetPrices = useCallback(() => {
        setEstimateData((prevData) => {
            const newSections = prevData.sections.map((section) => {
                const updatedItems = section.items.map((item) => {
                    const key = item.workId || `${item.code}_${item.name}`;
                    const originalPrice = originalPrices.get(key);

                    if (originalPrice !== undefined) {
                        return {
                            ...item,
                            price: originalPrice,
                            total: parseFloat((item.quantity * originalPrice).toFixed(2))
                        };
                    }
                    return item;
                });

                const newSubtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
                return { ...section, items: updatedItems, subtotal: newSubtotal };
            });
            return { ...prevData, sections: newSections };
        });
        setCurrentCoefficient(0);
        success('Цены сброшены до исходных');
    }, [originalPrices, success]);

    const handleUpdateWorkPriceInReference = useCallback(async (workId, currentPrice) => {
        try {
            await worksAPI.updatePrice(workId, currentPrice);
            success('Базовая цена обновлена в справочнике');
            setOriginalPrices(prev => {
                const next = new Map(prev);
                next.set(String(workId), currentPrice); // use workID string
                return next;
            });
        } catch (e) {
            showError('Ошибка обновления цены', e.message);
        }
    }, [success, showError]);

    return {
        estimateData,
        estimateMetadata,
        deferredEstimateData,
        originalPrices,
        currentCoefficient,
        loading,
        saving,
        isInitialLoadComplete,
        hasUnsavedChanges,
        setHasUnsavedChanges,

        addWorks,
        updateWorkQuantity,
        updateWorkPrice,
        removeWorkItem,
        addMaterialToWork,
        replaceMaterial,
        removeMaterial,
        updateMaterialConsumption,
        updateMaterialQuantity,
        updateMetadata,
        updateProjectData,
        save,
        clearEstimate,
        applyCoefficient,
        resetPrices,

        saveOriginalPrices,
        setEstimateMetadata,
        handleUpdateWorkPriceInReference
    };
};

export default useEstimateData;
