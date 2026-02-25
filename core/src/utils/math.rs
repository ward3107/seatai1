//! Mathematical utility functions

/// Calculate the mean of a slice of values
pub fn mean(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    values.iter().sum::<f64>() / values.len() as f64
}

/// Calculate the variance of a slice of values
pub fn variance(values: &[f64]) -> f64 {
    if values.len() < 2 {
        return 0.0;
    }

    let m = mean(values);
    values.iter().map(|x| (x - m).powi(2)).sum::<f64>() / values.len() as f64
}

/// Calculate the standard deviation
pub fn std_dev(values: &[f64]) -> f64 {
    variance(values).sqrt()
}

/// Normalize values to 0-1 range
pub fn normalize(values: &[f64]) -> Vec<f64> {
    if values.is_empty() {
        return vec![];
    }

    let min = values.iter().cloned().fold(f64::INFINITY, f64::min);
    let max = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

    if (max - min).abs() < f64::EPSILON {
        return vec![0.5; values.len()];
    }

    values.iter().map(|x| (x - min) / (max - min)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mean() {
        let values = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        assert!((mean(&values) - 3.0).abs() < 0.001);
    }

    #[test]
    fn test_variance() {
        let values = vec![2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0];
        assert!((variance(&values) - 4.0).abs() < 0.001);
    }

    #[test]
    fn test_normalize() {
        let values = vec![0.0, 50.0, 100.0];
        let normalized = normalize(&values);
        assert!((normalized[0] - 0.0).abs() < 0.001);
        assert!((normalized[1] - 0.5).abs() < 0.001);
        assert!((normalized[2] - 1.0).abs() < 0.001);
    }
}
