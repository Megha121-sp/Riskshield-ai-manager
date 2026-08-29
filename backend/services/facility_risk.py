import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.db.mongodb import db_manager, clean_mongo_doc
from backend.app.models.schemas import (
    FacilityRiskAssessment,
    FacilityFactor,
    FacilityProfile,
    FacilityHistoricalPoint,
    FacilityScenarioRequest,
    FacilityScenarioResponse,
    FacilityConfigSchema
)

logger = logging.getLogger("riskshield.services.facility_risk")

DEFAULT_FACILITY_CONFIG = {
    "low_threshold": 30,
    "moderate_threshold": 60,
    "high_threshold": 80,
    "confidence_threshold": 70,
    "alert_threshold": 65,
    "alerts_enabled": True
}

# Pre-defined realistic, illustrative baseline dataset for all financial facilities
FACILITY_BASELINES: Dict[str, Dict[str, Any]] = {
    "Education Loan": {
        "facility_id": "FAC_EDU_01",
        "facility_name": "Education Loan",
        "risk_score": 42.0,
        "risk_level": "MODERATE",
        "suitability_signal": "MODERATE RISK",
        "suitability_recommendation": "Suitable for consideration with additional due diligence.",
        "default_risk": 38.0,
        "default_risk_level": "Moderate",
        "portfolio_risk": 45.0,
        "portfolio_risk_level": "Moderate",
        "loss_severity": 31.0,
        "loss_severity_level": "Low",
        "liquidity_risk": 52.0,
        "liquidity_risk_level": "Moderate",
        "concentration_risk": 29.0,
        "concentration_risk_level": "Low",
        "operational_risk": 25.0,
        "data_confidence": 86.0,
        "confidence_level": "High",
        "executive_assessment": "Education Loan facilities are currently assessed as MODERATE RISK. The primary risk contributors are repayment duration and borrower income uncertainty during study years. Government guarantee coverage and co-borrower parent underwriting partially offset these risks.",
        "primary_concern": "Repayment Capacity Post-Graduation",
        "risk_trend": "STABLE",
        "risk_factors": [
            {"name": "Repayment Duration", "impact": 1.82, "explanation": "Extended repayment horizons (7-15 years) increase cumulative exposure to macroeconomic cycles.", "factor_type": "RISK_INCREASING"},
            {"name": "Borrower Income Stability", "impact": 1.47, "explanation": "Student employment outcomes are variable based on academic stream and macroeconomic hiring.", "factor_type": "RISK_INCREASING"},
            {"name": "Historical Default Rate", "impact": 1.21, "explanation": "Historical defaults in tier-2/3 institutions demonstrate moderate portfolio vulnerability.", "factor_type": "RISK_INCREASING"},
            {"name": "Loan-to-Income Ratio", "impact": 0.93, "explanation": "Initial leverage relative to starting salaries is moderately elevated in professional courses.", "factor_type": "RISK_INCREASING"},
            {"name": "Collateral & Co-Obligor Coverage", "impact": -0.64, "explanation": "Parental co-signers and tangible security for premier courses significantly reduce loss severity.", "factor_type": "RISK_REDUCING"},
            {"name": "Government Interest Subvention", "impact": -0.42, "explanation": "Subsidized interest schemes and credit guarantee funds provide liquidity safety buffers.", "factor_type": "RISK_REDUCING"}
        ],
        "profile": {
            "facility_type": "Education Loan",
            "typical_tenure": "5 to 15 Years",
            "risk_category": "Priority Sector Lending / Retail",
            "collateral_requirement": "Mandatory > ₹7.5 Lakhs (Parent Co-borrower mandatory)",
            "repayment_structure": "Moratorium Period + Equated Monthly Installments (EMI)",
            "portfolio_exposure": "₹14,500 Cr (12.4% of total facility exposure)",
            "data_coverage": "36 Months Portfolio History (8,420 loans evaluated)",
            "assessment_date": "August 2026"
        },
        "historical_trend": [
            {"period": "Month 1", "risk_score": 40.0, "default_rate": 3.1},
            {"period": "Month 2", "risk_score": 41.0, "default_rate": 3.2},
            {"period": "Month 3", "risk_score": 41.5, "default_rate": 3.3},
            {"period": "Month 4", "risk_score": 43.0, "default_rate": 3.5},
            {"period": "Month 5", "risk_score": 42.5, "default_rate": 3.4},
            {"period": "Month 6", "risk_score": 42.0, "default_rate": 3.3}
        ]
    },
    "Health / Medical Loan": {
        "facility_id": "FAC_MED_02",
        "facility_name": "Health / Medical Loan",
        "risk_score": 56.0,
        "risk_level": "MODERATE",
        "suitability_signal": "MODERATE RISK",
        "suitability_recommendation": "Suitable for consideration with additional due diligence.",
        "default_risk": 51.0,
        "default_risk_level": "Moderate",
        "portfolio_risk": 47.0,
        "portfolio_risk_level": "Moderate",
        "loss_severity": 58.0,
        "loss_severity_level": "Moderate",
        "liquidity_risk": 42.0,
        "liquidity_risk_level": "Moderate",
        "concentration_risk": 38.0,
        "concentration_risk_level": "Moderate",
        "operational_risk": 34.0,
        "data_confidence": 82.0,
        "confidence_level": "High",
        "executive_assessment": "Health and Medical Loan facilities are assessed as MODERATE RISK (Score: 56). Unplanned emergency medical financing carries elevated sudden default vulnerability, partially mitigated by direct hospital disbursement verification.",
        "primary_concern": "Medical Emergency Distress Defaults",
        "risk_trend": "DETERIORATING",
        "risk_factors": [
            {"name": "Emergency Underwriting Constraints", "impact": 2.14, "explanation": "Urgent disbursals reduce pre-disbursement income verification depth.", "factor_type": "RISK_INCREASING"},
            {"name": "Health Shock to Household Income", "impact": 1.76, "explanation": "Medical events directly impair the borrower's earning capacity during treatment.", "factor_type": "RISK_INCREASING"},
            {"name": "Unsecured Nature", "impact": 1.35, "explanation": "Majority of elective/emergency medical advances are non-collateralized.", "factor_type": "RISK_INCREASING"},
            {"name": "Direct Hospital Disbursement", "impact": -0.85, "explanation": "Funds paid directly to accredited hospitals eliminate fund diversion risk.", "factor_type": "RISK_REDUCING"},
            {"name": "Insurance Co-Pay Linkage", "impact": -0.52, "explanation": "TPA insurance claims settle a substantial portion of aggregate invoice values.", "factor_type": "RISK_REDUCING"}
        ],
        "profile": {
            "facility_type": "Health / Medical Loan",
            "typical_tenure": "12 to 36 Months",
            "risk_category": "Unsecured Consumer Healthcare",
            "collateral_requirement": "Unsecured (Zero collateral; salary deduction preferred)",
            "repayment_structure": "Monthly Fixed Equated Installments",
            "portfolio_exposure": "₹6,800 Cr (5.8% of total facility exposure)",
            "data_coverage": "24 Months Portfolio History (14,200 advances)",
            "assessment_date": "August 2026"
        },
        "historical_trend": [
            {"period": "Month 1", "risk_score": 48.0, "default_rate": 4.1},
            {"period": "Month 2", "risk_score": 50.0, "default_rate": 4.3},
            {"period": "Month 3", "risk_score": 52.0, "default_rate": 4.6},
            {"period": "Month 4", "risk_score": 54.0, "default_rate": 4.8},
            {"period": "Month 5", "risk_score": 55.5, "default_rate": 5.0},
            {"period": "Month 6", "risk_score": 56.0, "default_rate": 5.2}
        ]
    },
    "Home Loan": {
        "facility_id": "FAC_HOM_03",
        "facility_name": "Home Loan",
        "risk_score": 34.0,
        "risk_level": "MODERATE",
        "suitability_signal": "LOWER RISK",
        "suitability_recommendation": "Relatively lower risk based on the available indicators; continued monitoring is recommended.",
        "default_risk": 29.0,
        "default_risk_level": "Low",
        "portfolio_risk": 25.0,
        "portfolio_risk_level": "Low",
        "loss_severity": 19.0,
        "loss_severity_level": "Low",
        "liquidity_risk": 40.0,
        "liquidity_risk_level": "Moderate",
        "concentration_risk": 32.0,
        "concentration_risk_level": "Moderate",
        "operational_risk": 18.0,
        "data_confidence": 91.0,
        "confidence_level": "High",
        "executive_assessment": "Home Loan portfolios represent the lowest default risk segment (Score: 34). First-lien residential property mortgage and borrower emotional equity ensure strong repayment discipline across interest rate cycles.",
        "primary_concern": "Interest Rate Cycle Sensitivity & Prepayment Volatility",
        "risk_trend": "IMPROVING",
        "risk_factors": [
            {"name": "Long Amortization Tenure", "impact": 1.15, "explanation": "15 to 30-year contracts expose lenders to extended macroeconomic fluctuations.", "factor_type": "RISK_INCREASING"},
            {"name": "Interest Rate Fluctuations", "impact": 0.82, "explanation": "Floating rate increases elevate debt servicing burden on fixed-income families.", "factor_type": "RISK_INCREASING"},
            {"name": "First-Lien Mortgage Security", "impact": -1.95, "explanation": "Registered residential mortgage with typical 75% LTV preserves principal recovery.", "factor_type": "RISK_REDUCING"},
            {"name": "Emotional Borrower Equity", "impact": -1.10, "explanation": "Primary residential homes have the lowest delinquency rates across retail credit.", "factor_type": "RISK_REDUCING"},
            {"name": "Stringent Legal Due Diligence", "impact": -0.74, "explanation": "Clear title search and municipal regulatory checks safeguard collateral validity.", "factor_type": "RISK_REDUCING"}
        ],
        "profile": {
            "facility_type": "Home Loan",
            "typical_tenure": "15 to 30 Years",
            "risk_category": "Secured Retail Mortgage",
            "collateral_requirement": "Mandatory First Legal Mortgage over Property",
            "repayment_structure": "Monthly Reducing Balance EMI",
            "portfolio_exposure": "₹52,400 Cr (44.8% of total facility exposure)",
            "data_coverage": "60 Months Portfolio History (32,000 active mortgages)",
            "assessment_date": "August 2026"
        },
        "historical_trend": [
            {"period": "Month 1", "risk_score": 37.0, "default_rate": 1.9},
            {"period": "Month 2", "risk_score": 36.0, "default_rate": 1.8},
            {"period": "Month 3", "risk_score": 35.5, "default_rate": 1.8},
            {"period": "Month 4", "risk_score": 35.0, "default_rate": 1.7},
            {"period": "Month 5", "risk_score": 34.5, "default_rate": 1.7},
            {"period": "Month 6", "risk_score": 34.0, "default_rate": 1.6}
        ]
    },
    "Personal Loan": {
        "facility_id": "FAC_PER_04",
        "facility_name": "Personal Loan",
        "risk_score": 68.0,
        "risk_level": "HIGH",
        "suitability_signal": "HIGHER RISK",
        "suitability_recommendation": "Requires enhanced due diligence and risk controls before allocation.",
        "default_risk": 65.0,
        "default_risk_level": "High",
        "portfolio_risk": 61.0,
        "portfolio_risk_level": "High",
        "loss_severity": 72.0,
        "loss_severity_level": "High",
        "liquidity_risk": 70.0,
        "liquidity_risk_level": "High",
        "concentration_risk": 44.0,
        "concentration_risk_level": "Moderate",
        "operational_risk": 39.0,
        "data_confidence": 79.0,
        "confidence_level": "High",
        "executive_assessment": "Personal Loan facilities carry HIGH RISK (Score: 68). Absence of collateral and high borrower leverage across digital micro-lenders create compounding loss severity upon income disruptions.",
        "primary_concern": "Unsecured Over-Leveraging & Stacking",
        "risk_trend": "DETERIORATING",
        "risk_factors": [
            {"name": "Zero Collateralization", "impact": 2.65, "explanation": "Complete absence of tangible security leads to near-zero post-default recovery.", "factor_type": "RISK_INCREASING"},
            {"name": "Multi-Lender Loan Stacking", "impact": 2.12, "explanation": "Borrowers increasingly maintain multiple simultaneous fintech personal credit lines.", "factor_type": "RISK_INCREASING"},
            {"name": "Discretionary Consumption Use", "impact": 1.54, "explanation": "Funds frequently used for non-productive consumption rather than asset creation.", "factor_type": "RISK_INCREASING"},
            {"name": "Automated NACH Mandate Enforcement", "impact": -0.68, "explanation": "Electronic bank debit mandates enforce primary salary-day deduction.", "factor_type": "RISK_REDUCING"},
            {"name": "CIBIL / Bureau Score Floor", "impact": -0.45, "explanation": "Strict cutoff filters (CIBIL >= 720) filter out sub-prime retail applicants.", "factor_type": "RISK_REDUCING"}
        ],
        "profile": {
            "facility_type": "Personal Loan",
            "typical_tenure": "1 to 5 Years",
            "risk_category": "Unsecured Retail Credit",
            "collateral_requirement": "None (Clean unsecured)",
            "repayment_structure": "Monthly Fixed EMI via e-NACH",
            "portfolio_exposure": "₹18,900 Cr (16.2% of total facility exposure)",
            "data_coverage": "36 Months Portfolio History (41,200 loans)",
            "assessment_date": "August 2026"
        },
        "historical_trend": [
            {"period": "Month 1", "risk_score": 62.0, "default_rate": 5.4},
            {"period": "Month 2", "risk_score": 63.5, "default_rate": 5.6},
            {"period": "Month 3", "risk_score": 65.0, "default_rate": 5.8},
            {"period": "Month 4", "risk_score": 66.5, "default_rate": 6.1},
            {"period": "Month 5", "risk_score": 67.2, "default_rate": 6.3},
            {"period": "Month 6", "risk_score": 68.0, "default_rate": 6.5}
        ]
    },
    "MSME Loan": {
        "facility_id": "FAC_MSM_05",
        "facility_name": "MSME Loan",
        "risk_score": 61.0,
        "risk_level": "HIGH",
        "suitability_signal": "HIGHER RISK",
        "suitability_recommendation": "Requires enhanced due diligence and risk controls before allocation.",
        "default_risk": 58.0,
        "default_risk_level": "Moderate",
        "portfolio_risk": 55.0,
        "portfolio_risk_level": "Moderate",
        "loss_severity": 54.0,
        "loss_severity_level": "Moderate",
        "liquidity_risk": 64.0,
        "liquidity_risk_level": "High",
        "concentration_risk": 59.0,
        "concentration_risk_level": "Moderate",
        "operational_risk": 48.0,
        "data_confidence": 81.0,
        "confidence_level": "High",
        "executive_assessment": "MSME Loan facilities are evaluated as HIGH RISK (Score: 61). Working capital stress, vendor payment delay cycles, and sector-specific supply chain disruptions represent key risk catalysts.",
        "primary_concern": "Working Capital Delay & Cashflow Volatility",
        "risk_trend": "STABLE",
        "risk_factors": [
            {"name": "Supply Chain & Working Capital Cycles", "impact": 2.21, "explanation": "Extended receivables cycles from enterprise buyers create temporary liquidity dry-ups.", "factor_type": "RISK_INCREASING"},
            {"name": "Informal Bookkeeping & GST Discrepancies", "impact": 1.68, "explanation": "Discrepancy between declared banking turnover and audited financial filings.", "factor_type": "RISK_INCREASING"},
            {"name": "Sector-Specific Demand Shocks", "impact": 1.32, "explanation": "Heavy reliance on localized manufacturing or trading micro-ecosystems.", "factor_type": "RISK_INCREASING"},
            {"name": "CGTMSE Credit Guarantee Coverage", "impact": -1.15, "explanation": "Government credit guarantee coverage covers 75-85% of defaulted principal.", "factor_type": "RISK_REDUCING"},
            {"name": "Hypothecation of Plant & Receivables", "impact": -0.72, "explanation": "Charge over stock, plant machinery, and debtor books assists recovery.", "factor_type": "RISK_REDUCING"}
        ],
        "profile": {
            "facility_type": "MSME Loan",
            "typical_tenure": "3 to 7 Years",
            "risk_category": "Micro, Small & Medium Enterprise Banking",
            "collateral_requirement": "Hybrid (CGTMSE guarantee + Hypothecation of stocks)",
            "repayment_structure": "Monthly Principal + Interest / Term Amortization",
            "portfolio_exposure": "₹22,100 Cr (18.9% of total facility exposure)",
            "data_coverage": "36 Months Portfolio History (9,800 enterprise facilities)",
            "assessment_date": "August 2026"
        },
        "historical_trend": [
            {"period": "Month 1", "risk_score": 60.0, "default_rate": 5.1},
            {"period": "Month 2", "risk_score": 60.5, "default_rate": 5.2},
            {"period": "Month 3", "risk_score": 61.2, "default_rate": 5.3},
            {"period": "Month 4", "risk_score": 61.0, "default_rate": 5.2},
            {"period": "Month 5", "risk_score": 61.5, "default_rate": 5.3},
            {"period": "Month 6", "risk_score": 61.0, "default_rate": 5.2}
        ]
    },
    "Vehicle Loan": {
        "facility_id": "FAC_VEH_06",
        "facility_name": "Vehicle Loan",
        "risk_score": 49.0,
        "risk_level": "MODERATE",
        "suitability_signal": "MODERATE RISK",
        "suitability_recommendation": "Suitable for consideration with additional due diligence.",
        "default_risk": 44.0,
        "default_risk_level": "Moderate",
        "portfolio_risk": 41.0,
        "portfolio_risk_level": "Moderate",
        "loss_severity": 39.0,
        "loss_severity_level": "Moderate",
        "liquidity_risk": 45.0,
        "liquidity_risk_level": "Moderate",
        "concentration_risk": 35.0,
        "concentration_risk_level": "Moderate",
        "operational_risk": 28.0,
        "data_confidence": 88.0,
        "confidence_level": "High",
        "executive_assessment": "Vehicle Loan facilities demonstrate MODERATE RISK (Score: 49). Asset hypothecation and standard GPS repossession mechanisms offset vehicle depreciation and commercial fleet utilization swings.",
        "primary_concern": "Asset Depreciation & Commercial Fleet Utilization",
        "risk_trend": "IMPROVING",
        "risk_factors": [
            {"name": "Asset Market Depreciation", "impact": 1.45, "explanation": "Automobile values decline rapidly in years 1-3, creating potential underwater LTVs.", "factor_type": "RISK_INCREASING"},
            {"name": "Fuel & Operating Cost Volatility", "impact": 0.98, "explanation": "Escalating fuel prices stress commercial and gig-economy vehicle operators.", "factor_type": "RISK_INCREASING"},
            {"name": "Vehicle Hypothecation & RTO Endorsement", "impact": -1.42, "explanation": "Direct statutory lien on vehicle registration documents impedes unauthorized resale.", "factor_type": "RISK_REDUCING"},
            {"name": "Active GPS & Repossession Ecosystem", "impact": -0.88, "explanation": "Standardized recovery and auction resale channels preserve salvage recovery rates.", "factor_type": "RISK_REDUCING"},
            {"name": "Comprehensive Insurance Mandate", "impact": -0.55, "explanation": "Total loss or collision claims protect outstanding lender balances.", "factor_type": "RISK_REDUCING"}
        ],
        "profile": {
            "facility_type": "Vehicle Loan",
            "typical_tenure": "3 to 7 Years",
            "risk_category": "Secured Auto Financing",
            "collateral_requirement": "Vehicle Hypothecation (RTO Form 34/35)",
            "repayment_structure": "Monthly Fixed EMI",
            "portfolio_exposure": "₹12,200 Cr (10.4% of total facility exposure)",
            "data_coverage": "48 Months Portfolio History (22,500 active loans)",
            "assessment_date": "August 2026"
        },
        "historical_trend": [
            {"period": "Month 1", "risk_score": 52.0, "default_rate": 4.2},
            {"period": "Month 2", "risk_score": 51.0, "default_rate": 4.1},
            {"period": "Month 3", "risk_score": 50.5, "default_rate": 4.0},
            {"period": "Month 4", "risk_score": 50.0, "default_rate": 3.9},
            {"period": "Month 5", "risk_score": 49.5, "default_rate": 3.9},
            {"period": "Month 6", "risk_score": 49.0, "default_rate": 3.8}
        ]
    },
    "Agriculture Loan": {
        "facility_id": "FAC_AGR_07",
        "facility_name": "Agriculture Loan",
        "risk_score": 64.0,
        "risk_level": "HIGH",
        "suitability_signal": "HIGHER RISK",
        "suitability_recommendation": "Requires enhanced due diligence and risk controls before allocation.",
        "default_risk": 62.0,
        "default_risk_level": "High",
        "portfolio_risk": 66.0,
        "portfolio_risk_level": "High",
        "loss_severity": 58.0,
        "loss_severity_level": "Moderate",
        "liquidity_risk": 69.0,
        "liquidity_risk_level": "High",
        "concentration_risk": 72.0,
        "concentration_risk_level": "High",
        "operational_risk": 51.0,
        "data_confidence": 76.0,
        "confidence_level": "High",
        "executive_assessment": "Agriculture Loan facilities operate under HIGH RISK (Score: 64). Climate variability, seasonal monsoon dependency, and commodity market pricing introduce cyclical portfolio concentration risk.",
        "primary_concern": "Monsoon Weather Dependency & Price Volatility",
        "risk_trend": "STABLE",
        "risk_factors": [
            {"name": "Weather & Monsoon Vulnerability", "impact": 2.45, "explanation": "Unseasonal rains or droughts cause systemic crop failure across regional farming clusters.", "factor_type": "RISK_INCREASING"},
            {"name": "Commodity Farmgate Price Fluctuations", "impact": 1.84, "explanation": "Post-harvest price gluts lower net farm realizations and debt servicing capacity.", "factor_type": "RISK_INCREASING"},
            {"name": "Lump-sum Harvest Repayment Lags", "impact": 1.25, "explanation": "Bullet crop loan repayments create severe cash-flow timing mismatches.", "factor_type": "RISK_INCREASING"},
            {"name": "Kisan Credit Card (KCC) Institutional Support", "impact": -0.88, "explanation": "Interest subvention and institutional rollover frameworks maintain borrower engagement.", "factor_type": "RISK_REDUCING"},
            {"name": "PM Fasal Bima Yojana (Crop Insurance)", "impact": -0.65, "explanation": "Parametric crop insurance partially compensates acreage output losses.", "factor_type": "RISK_REDUCING"}
        ],
        "profile": {
            "facility_type": "Agriculture Loan",
            "typical_tenure": "6 Months to 5 Years",
            "risk_category": "Priority Sector Rural & Agri Finance",
            "collateral_requirement": "Agricultural Land Mortgage (for loans > ₹1.6 Lakhs)",
            "repayment_structure": "Half-Yearly / Post-Harvest Bullet Amortization",
            "portfolio_exposure": "₹16,400 Cr (14.0% of total facility exposure)",
            "data_coverage": "36 Months Portfolio History (18,900 accounts)",
            "assessment_date": "August 2026"
        },
        "historical_trend": [
            {"period": "Month 1", "risk_score": 63.0, "default_rate": 5.8},
            {"period": "Month 2", "risk_score": 63.5, "default_rate": 5.9},
            {"period": "Month 3", "risk_score": 64.0, "default_rate": 6.0},
            {"period": "Month 4", "risk_score": 64.2, "default_rate": 6.1},
            {"period": "Month 5", "risk_score": 64.5, "default_rate": 6.1},
            {"period": "Month 6", "risk_score": 64.0, "default_rate": 6.0}
        ]
    },
    "Consumer Loan": {
        "facility_id": "FAC_CON_08",
        "facility_name": "Consumer Loan",
        "risk_score": 72.0,
        "risk_level": "HIGH",
        "suitability_signal": "HIGHER RISK",
        "suitability_recommendation": "Requires enhanced due diligence and risk controls before allocation.",
        "default_risk": 69.0,
        "default_risk_level": "High",
        "portfolio_risk": 64.0,
        "portfolio_risk_level": "High",
        "loss_severity": 76.0,
        "loss_severity_level": "High",
        "liquidity_risk": 74.0,
        "liquidity_risk_level": "High",
        "concentration_risk": 51.0,
        "concentration_risk_level": "Moderate",
        "operational_risk": 42.0,
        "data_confidence": 84.0,
        "confidence_level": "High",
        "executive_assessment": "Consumer Durable & Digital POS Loans represent HIGH RISK (Score: 72). Low average ticket size combined with frictionless digital checkout incentives leads to impulse borrowings and higher loss-given-default.",
        "primary_concern": "Impulse Borrowing & High Loss Severity",
        "risk_trend": "DETERIORATING",
        "risk_factors": [
            {"name": "Zero Residual Value on Goods", "impact": 2.82, "explanation": "Consumer electronics rapidly lose resale value; repossession is economically unviable.", "factor_type": "RISK_INCREASING"},
            {"name": "Subprime First-Time Borrower Influx", "impact": 2.24, "explanation": "E-commerce point-of-sale financing attracts thin-file credit applicants.", "factor_type": "RISK_INCREASING"},
            {"name": "High Volume Default Operational Costs", "impact": 1.62, "explanation": "Legal recovery costs exceed the outstanding unpaid loan balance.", "factor_type": "RISK_INCREASING"},
            {"name": "Subvention Margins from Merchants", "impact": -0.74, "explanation": "Merchant discount rates and zero-cost EMI subsidies buffer lender net interest margins.", "factor_type": "RISK_REDUCING"},
            {"name": "Bureau Reporting Threat", "impact": -0.51, "explanation": "Borrowers fear CIBIL score impairment for relatively small loan defaults.", "factor_type": "RISK_REDUCING"}
        ],
        "profile": {
            "facility_type": "Consumer Loan",
            "typical_tenure": "3 to 24 Months",
            "risk_category": "Point-of-Sale Consumer Durable Finance",
            "collateral_requirement": "Hypothecation of Consumer Good (No collateral)",
            "repayment_structure": "Monthly Fixed Auto-Debit (UPI/e-NACH)",
            "portfolio_exposure": "₹7,600 Cr (6.5% of total facility exposure)",
            "data_coverage": "24 Months Portfolio History (62,000 retail contracts)",
            "assessment_date": "August 2026"
        },
        "historical_trend": [
            {"period": "Month 1", "risk_score": 67.0, "default_rate": 6.8},
            {"period": "Month 2", "risk_score": 68.5, "default_rate": 7.0},
            {"period": "Month 3", "risk_score": 69.5, "default_rate": 7.2},
            {"period": "Month 4", "risk_score": 70.8, "default_rate": 7.4},
            {"period": "Month 5", "risk_score": 71.5, "default_rate": 7.6},
            {"period": "Month 6", "risk_score": 72.0, "default_rate": 7.8}
        ]
    },
    "Other Financial Schemes": {
        "facility_id": "FAC_OTH_09",
        "facility_name": "Other Financial Schemes",
        "risk_score": 0.0,
        "risk_level": "INSUFFICIENT_DATA",
        "suitability_signal": "INSUFFICIENT DATA",
        "suitability_recommendation": "Additional portfolio and borrower information is required before making a reliable assessment.",
        "default_risk": 0.0,
        "default_risk_level": "Unknown",
        "portfolio_risk": 0.0,
        "portfolio_risk_level": "Unknown",
        "loss_severity": 0.0,
        "loss_severity_level": "Unknown",
        "liquidity_risk": 0.0,
        "liquidity_risk_level": "Unknown",
        "concentration_risk": 0.0,
        "concentration_risk_level": "Unknown",
        "operational_risk": 0.0,
        "data_confidence": 35.0,
        "confidence_level": "Low",
        "executive_assessment": "Insufficient verified credit data is available for miscellaneous and unclassified financial schemes. The RiskShield facility evaluation model requires at least 12 months of standardized historical cohort performance before generating calibrated risk metrics.",
        "primary_concern": "Data Coverage Below Statistical Reliability Floor",
        "risk_trend": "STABLE",
        "risk_factors": [
            {"name": "Lack of Standardized Credit Data", "impact": 3.10, "explanation": "Less than 100 historical loan lifecycles available for cohort default calibration.", "factor_type": "RISK_INCREASING"},
            {"name": "Unclear Regulatory Underwriting Framework", "impact": 2.45, "explanation": "Novel financial schemes exhibit shifting policy and statutory compliance definitions.", "factor_type": "RISK_INCREASING"}
        ],
        "profile": {
            "facility_type": "Other Financial Schemes",
            "typical_tenure": "Variable",
            "risk_category": "Experimental / Unclassified Lending Programs",
            "collateral_requirement": "To be determined per scheme policy",
            "repayment_structure": "Variable",
            "portfolio_exposure": "₹450 Cr (0.4% of total facility exposure)",
            "data_coverage": "Under 6 Months (Fewer than 150 accounts)",
            "assessment_date": "August 2026"
        },
        "historical_trend": [
            {"period": "Month 1", "risk_score": 0.0, "default_rate": 0.0},
            {"period": "Month 2", "risk_score": 0.0, "default_rate": 0.0},
            {"period": "Month 3", "risk_score": 0.0, "default_rate": 0.0},
            {"period": "Month 4", "risk_score": 0.0, "default_rate": 0.0},
            {"period": "Month 5", "risk_score": 0.0, "default_rate": 0.0},
            {"period": "Month 6", "risk_score": 0.0, "default_rate": 0.0}
        ]
    }
}


class FacilityRiskService:
    def __init__(self):
        self.config = DEFAULT_FACILITY_CONFIG.copy()

    def get_risk_level(self, score: float, confidence: float) -> str:
        if confidence < self.config["confidence_threshold"]:
            return "INSUFFICIENT_DATA"
        if score <= self.config["low_threshold"]:
            return "LOW"
        elif score <= self.config["moderate_threshold"]:
            return "MODERATE"
        elif score <= self.config["high_threshold"]:
            return "HIGH"
        else:
            return "CRITICAL"

    def get_suitability(self, risk_level: str) -> tuple[str, str]:
        if risk_level == "LOW":
            return (
                "LOWER RISK",
                "Relatively lower risk based on the available indicators; continued monitoring is recommended."
            )
        elif risk_level == "MODERATE":
            return (
                "MODERATE RISK",
                "Suitable for consideration with additional due diligence."
            )
        elif risk_level in ["HIGH", "CRITICAL"]:
            return (
                "HIGHER RISK",
                "Requires enhanced due diligence and risk controls before allocation."
            )
        else:
            return (
                "INSUFFICIENT DATA",
                "Additional portfolio and borrower information is required before making a reliable assessment."
            )

    async def get_all_facilities(self) -> List[FacilityRiskAssessment]:
        """Return baseline assessments for all facilities."""
        facilities = []
        for name, data in FACILITY_BASELINES.items():
            assessment = FacilityRiskAssessment(
                **data,
                facility_type=data.get("facility_type") or name,
                assessment_id=f"ASSESS_{data['facility_id']}_{datetime.now(timezone.utc).strftime('%Y%m')}",
                timestamp=datetime.now(timezone.utc)
            )
            facilities.append(assessment)
        return facilities

    async def get_facility(self, facility_type: str) -> Optional[FacilityRiskAssessment]:
        """Retrieve assessment for a specific facility type."""
        # Case-insensitive lookup
        matched_key = None
        for key in FACILITY_BASELINES.keys():
            if key.lower().replace(" ", "") == facility_type.lower().replace(" ", "") or \
               key.lower().startswith(facility_type.lower()[:4]):
                matched_key = key
                break

        if not matched_key:
            return None

        data = FACILITY_BASELINES[matched_key]
        return FacilityRiskAssessment(
            **data,
            facility_type=data.get("facility_type") or matched_key,
            assessment_id=f"ASSESS_{data['facility_id']}_{datetime.now(timezone.utc).strftime('%Y%m')}",
            timestamp=datetime.now(timezone.utc)
        )


    def simulate_scenario(self, req: FacilityScenarioRequest) -> FacilityScenarioResponse:
        """
        Dynamically calculate illustrative projected risk score based on perturbed scenario parameters.
        """
        base = FACILITY_BASELINES.get(req.facility_type)
        if not base or base["risk_level"] == "INSUFFICIENT_DATA":
            return FacilityScenarioResponse(
                facility_type=req.facility_type,
                original_score=0.0,
                projected_score=0.0,
                score_delta=0.0,
                original_level="INSUFFICIENT_DATA",
                projected_level="INSUFFICIENT_DATA",
                original_suitability="INSUFFICIENT DATA",
                projected_suitability="INSUFFICIENT DATA",
                key_drivers=["Insufficient portfolio data to execute simulation."],
                is_demo_data=True
            )

        orig_score = base["risk_score"]
        delta = 0.0
        drivers = []

        # 1. Default Rate
        if req.default_rate.upper() == "HIGH":
            delta += 14.0
            drivers.append("Projected elevated default rate (+14.0 pts)")
        elif req.default_rate.upper() == "LOW":
            delta -= 7.0
            drivers.append("Lower historical default frequency (-7.0 pts)")

        # 2. Income Stability
        if req.income_stability.upper() == "LOW":
            delta += 9.0
            drivers.append("Reduced borrower income stability (+9.0 pts)")
        elif req.income_stability.upper() == "HIGH":
            delta -= 6.0
            drivers.append("Robust stable salaried employment (-6.0 pts)")

        # 3. Loan Tenure
        if req.loan_tenure.upper() == "LONG":
            delta += 7.0
            drivers.append("Extended loan tenure duration risk (+7.0 pts)")
        elif req.loan_tenure.upper() == "SHORT":
            delta -= 5.0
            drivers.append("Shorter amortization window (-5.0 pts)")

        # 4. Collateral Coverage
        if req.collateral_coverage.upper() == "LOW":
            delta += 11.0
            drivers.append("Insufficient collateral haircut (+11.0 pts)")
        elif req.collateral_coverage.upper() == "HIGH":
            delta -= 9.0
            drivers.append("High collateral asset coverage (-9.0 pts)")

        # 5. Portfolio Concentration
        if req.portfolio_concentration.upper() == "HIGH":
            delta += 8.0
            drivers.append("Geographic/segment portfolio concentration (+8.0 pts)")
        elif req.portfolio_concentration.upper() == "LOW":
            delta -= 4.0
            drivers.append("Well-diversified portfolio distribution (-4.0 pts)")

        projected = max(10.0, min(95.0, round(orig_score + delta, 1)))
        delta_val = round(projected - orig_score, 1)

        proj_level = self.get_risk_level(projected, base["data_confidence"])
        orig_sig, _ = self.get_suitability(base["risk_level"])
        proj_sig, _ = self.get_suitability(proj_level)

        return FacilityScenarioResponse(
            facility_type=req.facility_type,
            original_score=orig_score,
            projected_score=projected,
            score_delta=delta_val,
            original_level=base["risk_level"],
            projected_level=proj_level,
            original_suitability=orig_sig,
            projected_suitability=proj_sig,
            key_drivers=drivers or ["Standard baseline configuration maintained."],
            is_demo_data=True
        )

    async def get_overview_summary(self) -> Dict[str, Any]:
        """Aggregate summary metrics for the main Overview page."""
        all_facs = list(FACILITY_BASELINES.values())
        high_risk_count = sum(1 for f in all_facs if f["risk_level"] == "HIGH")
        valid_scores = [f["risk_score"] for f in all_facs if f["risk_level"] != "INSUFFICIENT_DATA"]
        avg_risk = round(sum(valid_scores) / len(valid_scores), 1) if valid_scores else 47.0

        return {
            "facility_risk_alerts": 4,
            "high_risk_facilities": high_risk_count,
            "facilities_under_review": len(all_facs) - 1,
            "average_facility_risk": avg_risk,
            "total_exposure_under_review": "₹1,43,600 Cr",
            "is_demo_data": True
        }

    async def seed_facility_alerts(self):
        """Ensure representative facility alerts exist in the risk_alerts collection."""
        alert_coll = db_manager.get_collection("risk_alerts")
        facility_alerts = [
            {
                "alert_id": "ALT_FAC_01",
                "severity": "HIGH",
                "alert_type": "HIGH_FACILITY_RISK",
                "title": "High Facility Risk: Personal Loan Portfolio",
                "description": "Personal Loan facility risk score (68/100) crossed the configured alert threshold (65/100) due to unsecured multi-lender stacking.",
                "transaction_ids": [],
                "facility_id": "FAC_PER_04",
                "facility_type": "Personal Loan",
                "status": "OPEN",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "alert_id": "ALT_FAC_02",
                "severity": "MEDIUM",
                "alert_type": "RISK_DETERIORATION",
                "title": "Risk Deterioration: Health / Medical Loan",
                "description": "Health Loan risk score deteriorated from 48 to 56 over the last 30-day assessment window.",
                "transaction_ids": [],
                "facility_id": "FAC_MED_02",
                "facility_type": "Health / Medical Loan",
                "status": "OPEN",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "alert_id": "ALT_FAC_03",
                "severity": "HIGH",
                "alert_type": "CONCENTRATION_WARNING",
                "title": "Concentration Warning: Agriculture Loan Segment",
                "description": "Portfolio exposure in regional agricultural schemes exhibits high geographic and weather correlation risk (Score: 64/100).",
                "transaction_ids": [],
                "facility_id": "FAC_AGR_07",
                "facility_type": "Agriculture Loan",
                "status": "OPEN",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "alert_id": "ALT_FAC_04",
                "severity": "LOW",
                "alert_type": "INSUFFICIENT_DATA",
                "title": "Insufficient Data: Other Financial Schemes",
                "description": "Data confidence for Other Financial Schemes (35%) is below the configured confidence threshold (70%).",
                "transaction_ids": [],
                "facility_id": "FAC_OTH_09",
                "facility_type": "Other Financial Schemes",
                "status": "OPEN",
                "created_at": datetime.now(timezone.utc)
            }
        ]

        for fa in facility_alerts:
            await alert_coll.update_one(
                {"alert_id": fa["alert_id"]},
                {"$setOnInsert": fa},
                upsert=True
            )


facility_risk_service = FacilityRiskService()
