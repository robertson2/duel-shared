"""
Prefect Flows Entry Point
Run with: python -m backend.orchestration
"""

from .prefect_flows import advocacy_etl_flow


def main():
    """Run the ETL flow manually"""
    print("Running ETL flow manually...")
    result = advocacy_etl_flow()
    print(f"\nResult: {result}")


if __name__ == "__main__":
    main()

