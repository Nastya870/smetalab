import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid
} from '@mui/material';

const ESTIMATE_TYPES = [
    'строительство',
    'реконструкция',
    'капремонт',
    'проектные работы',
    'другое'
];

const ESTIMATE_STATUSES = [
    { value: 'draft', label: 'Черновик' },
    { value: 'in_review', label: 'На проверке' },
    { value: 'approved', label: 'Утверждена' },
    { value: 'rejected', label: 'Отклонена' },
    { value: 'completed', label: 'Завершена' }
];

const EstimateMetadataForm = ({ open, onClose, metadata, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        status: 'draft',
        estimateType: 'строительство',
        description: '',
        estimateDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (open && metadata) {
            setFormData({
                name: metadata.name || '',
                status: metadata.status || 'draft',
                estimateType: metadata.estimateType || 'строительство',
                description: metadata.description || '',
                estimateDate: metadata.estimateDate ? new Date(metadata.estimateDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            });
        }
    }, [open, metadata]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onSave(formData);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Редактирование параметров сметы</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Название сметы"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            autoFocus
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <FormControl fullWidth>
                            <InputLabel>Тип сметы</InputLabel>
                            <Select
                                name="estimateType"
                                value={formData.estimateType}
                                label="Тип сметы"
                                onChange={handleChange}
                            >
                                {ESTIMATE_TYPES.map(type => (
                                    <MenuItem key={type} value={type}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                        <FormControl fullWidth>
                            <InputLabel>Статус</InputLabel>
                            <Select
                                name="status"
                                value={formData.status}
                                label="Статус"
                                onChange={handleChange}
                            >
                                {ESTIMATE_STATUSES.map(status => (
                                    <MenuItem key={status.value} value={status.value}>
                                        {status.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Дата составления"
                            type="date"
                            name="estimateDate"
                            value={formData.estimateDate}
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Описание"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            multiline
                            rows={3}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Отмена</Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                    Сохранить
                </Button>
            </DialogActions>
        </Dialog>
    );
};

EstimateMetadataForm.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    metadata: PropTypes.object,
    onSave: PropTypes.func.isRequired
};

export default EstimateMetadataForm;
