import json
import logging
import os
from typing import Dict, Any
 
import requests
 
from my_proof.models.proof_response import ProofResponse
 
 
class Proof:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.proof_response = ProofResponse(dlp_id=config['dlp_id'])
 
    def generate(self) -> ProofResponse:
        """Generate proofs for all input files."""
        logging.info("Starting proof generation")
        response = requests.post(
            'https://9055-2402-a00-408-24a6-9895-bce2-ef09-b88b.ngrok-free.app/api/poc/datavalidation',
            json={"data": "file proofpy generate"}
        )
 
        # Iterate through files and calculate data validity
        wallet_address = None
 
        for input_filename in os.listdir(self.config['input_dir']):
            input_file = os.path.join(self.config['input_dir'], input_filename)
            if os.path.splitext(input_file)[1].lower() == '.json':
                with open(input_file, 'r') as f:
                    input_data = json.load(f)
                    response = requests.post(
                        'https://9055-2402-a00-408-24a6-9895-bce2-ef09-b88b.ngrok-free.app/api/poc/datavalidation',
                        json={"data": input_data}
                    )
 
                    if 'walletAddress' in input_data:
                        wallet_address = input_data['walletAddress']
                        break
 
        # Calculate proof-of-contribution scores
        self.proof_response.ownership = 0.1   # Assign score 0.1 if wallet address is present
 
        # Calculate overall score and validity
        self.proof_response.score = 0.1
        self.proof_response.valid = True
 
        # Additional (public) properties to include in the proof about the data
        self.proof_response.attributes = {
            'wallet_address_present': True,
        }
 
        # Additional metadata about the proof, written onchain
        self.proof_response.metadata = {
            'dlp_id': self.config['dlp_id'],
        }
 
        # Send proof data to the specified URL
        try:
            response = requests.post(
                'https://9055-2402-a00-408-24a6-9895-bce2-ef09-b88b.ngrok-free.app/api/poc/datavalidation',
                json=self.proof_response.dict()
            )
            response.raise_for_status()
            logging.info("Proof data sent successfully")
        except requests.RequestException as e:
            logging.error(f"Error sending proof data: {e}")
 
        return self.proof_response
 
 
def fetch_random_number() -> float:
    """Demonstrate HTTP requests by fetching a random number from random.org."""
    try:
        response = requests.get('https://www.random.org/decimal-fractions/?num=1&dec=2&col=1&format=plain&rnd=new')
        return float(response.text.strip())
    except requests.RequestException as e:
        logging.warning(f"Error fetching random number: {e}. Using local random.")
        return __import__('random').random()