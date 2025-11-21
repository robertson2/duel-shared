"""
Deploy Prefect flows to local Prefect server
Run this once to make the flows available via API

Usage:
    python -m backend.orchestration.deploy

This will register the flows with Prefect server so they can be:
- Triggered via the web UI
- Triggered via API calls
- Monitored in real-time
"""

import sys


def deploy_flows():
    """
    Deploy both ETL flows to Prefect server using .serve()
    """
    try:
        from backend.orchestration.prefect_flows import advocacy_etl_flow, weekly_analytics_refresh
        
        print("="*80)
        print("🚀 Deploying Prefect Flows")
        print("="*80)
        print("\nThis will make the flows available for triggering via:")
        print("  • Prefect Web UI (http://localhost:4200)")
        print("  • API trigger button")
        print("  • Prefect API calls")
        print("\n" + "="*80)
        
        # Serve both flows
        # This creates deployments and keeps a worker running to execute them
        print("\n📦 Serving flows...")
        print("   - Advocacy Platform ETL (every 60 minutes)")
        print("\n⏰ Schedule: Runs automatically every 60 minutes")
        print("⚠️  Keep this script running to handle scheduled and triggered flows")
        print("   Press Ctrl+C to stop")
        print("="*80 + "\n")
        
        # Serve the flows (this blocks and keeps running)
        from datetime import timedelta
        
        advocacy_etl_flow.serve(
            name="advocacy-etl-deployment",
            tags=["etl", "advocacy", "scheduled"],
            description="ETL pipeline for advocacy platform (runs every 60 minutes)",
            interval=timedelta(minutes=60)
        )
        
    except KeyboardInterrupt:
        print("\n\n" + "="*80)
        print("🛑 Stopping Prefect deployment server")
        print("="*80)
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error deploying flows: {e}")
        print("\nMake sure:")
        print("  1. Prefect server is running (prefect server start)")
        print("  2. Python environment has prefect installed")
        print("  3. backend/orchestration/prefect_flows.py is accessible")
        sys.exit(1)


if __name__ == "__main__":
    deploy_flows()

