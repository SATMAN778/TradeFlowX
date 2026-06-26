import subprocess
import json

def main():
    try:
        res = subprocess.run(
            'uip df entities list --output json',
            shell=True, capture_output=True, text=True, check=True
        )
        data = json.loads(res.stdout)
        entities = data.get('Data', [])
        
        print(f"Total entities: {len(entities)}")
        for e in entities:
            print(f"Name: {e.get('Name')}, Display: {e.get('DisplayName')}, Id: {e.get('Id')}, Type: {e.get('EntityType')}, Source: {e.get('Source')}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
