from flask import Flask, render_template, jsonify, request
from functools import wraps
import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
import json

app = Flask(__name__, 
            template_folder='../templates',
            static_folder='../static')

# Firebase 초기화
if not firebase_admin._apps:
    # Vercel 환경변수에서 서비스 계정 정보 로드
    firebase_config = os.environ.get('FIREBASE_SERVICE_ACCOUNT')
    if firebase_config:
        cred_dict = json.loads(firebase_config)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
    else:
        # 로컬 개발용
        try:
            cred = credentials.Certificate('serviceAccountKey.json')
            firebase_admin.initialize_app(cred)
        except:
            pass

db = firestore.client() if firebase_admin._apps else None


def verify_token(f):
    """Firebase 토큰 검증 데코레이터"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': '인증이 필요합니다'}), 401
        try:
            decoded = auth.verify_id_token(token)
            request.user = decoded
        except Exception as e:
            return jsonify({'error': '유효하지 않은 토큰입니다'}), 401
        return f(*args, **kwargs)
    return decorated


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/api/products', methods=['GET'])
def get_products():
    """상품 목록 조회"""
    if not db:
        # 데모 데이터
        return jsonify([
            {
                'id': '1',
                'name': '미래형 재킷',
                'price': 189000,
                'image': '[images.unsplash.com](https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400)',
                'category': 'outer',
                'description': '홀로그램 소재의 미래지향적 재킷'
            },
            {
                'id': '2',
                'name': '네온 후디',
                'price': 89000,
                'image': '[images.unsplash.com](https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400)',
                'category': 'top',
                'description': 'LED 패널 내장 스마트 후디'
            },
            {
                'id': '3',
                'name': '테크웨어 팬츠',
                'price': 129000,
                'image': '[images.unsplash.com](https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400)',
                'category': 'bottom',
                'description': '방수 기능의 테크니컬 팬츠'
            },
            {
                'id': '4',
                'name': '글로우 스니커즈',
                'price': 219000,
                'image': '[images.unsplash.com](https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400)',
                'category': 'shoes',
                'description': '야광 솔 스니커즈'
            },
            {
                'id': '5',
                'name': '사이버 선글라스',
                'price': 79000,
                'image': '[images.unsplash.com](https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400)',
                'category': 'accessory',
                'description': 'AR 지원 스마트 선글라스'
            },
            {
                'id': '6',
                'name': '메탈릭 드레스',
                'price': 159000,
                'image': '[images.unsplash.com](https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400)',
                'category': 'dress',
                'description': '메탈릭 광택의 미래형 드레스'
            }
        ])
    
    try:
        products_ref = db.collection('products')
        docs = products_ref.stream()
        products = []
        for doc in docs:
            product = doc.to_dict()
            product['id'] = doc.id
            products.append(product)
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/products/<product_id>', methods=['GET'])
def get_product(product_id):
    """상품 상세 조회"""
    if not db:
        return jsonify({'error': '데이터베이스 연결 없음'}), 500
    
    try:
        doc = db.collection('products').document(product_id).get()
        if doc.exists:
            product = doc.to_dict()
            product['id'] = doc.id
            return jsonify(product)
        return jsonify({'error': '상품을 찾을 수 없습니다'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/cart', methods=['GET'])
@verify_token
def get_cart():
    """장바구니 조회"""
    user_id = request.user['uid']
    try:
        cart_ref = db.collection('carts').document(user_id)
        doc = cart_ref.get()
        if doc.exists:
            return jsonify(doc.to_dict())
        return jsonify({'items': []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/cart', methods=['POST'])
@verify_token
def add_to_cart():
    """장바구니 추가"""
    user_id = request.user['uid']
    data = request.json
    
    try:
        cart_ref = db.collection('carts').document(user_id)
        doc = cart_ref.get()
        
        if doc.exists:
            cart = doc.to_dict()
            items = cart.get('items', [])
            
            # 이미 있는 상품인지 확인
            found = False
            for item in items:
                if item['productId'] == data['productId']:
                    item['quantity'] += data.get('quantity', 1)
                    found = True
                    break
            
            if not found:
                items.append({
                    'productId': data['productId'],
                    'quantity': data.get('quantity', 1),
                    'size': data.get('size', 'M')
                })
            
            cart_ref.update({'items': items})
        else:
            cart_ref.set({
                'items': [{
                    'productId': data['productId'],
                    'quantity': data.get('quantity', 1),
                    'size': data.get('size', 'M')
                }]
            })
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/cart/<product_id>', methods=['DELETE'])
@verify_token
def remove_from_cart(product_id):
    """장바구니에서 삭제"""
    user_id = request.user['uid']
    
    try:
        cart_ref = db.collection('carts').document(user_id)
        doc = cart_ref.get()
        
        if doc.exists:
            cart = doc.to_dict()
            items = [item for item in cart.get('items', []) 
                    if item['productId'] != product_id]
            cart_ref.update({'items': items})
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/orders', methods=['POST'])
@verify_token
def create_order():
    """주문 생성"""
    user_id = request.user['uid']
    data = request.json
    
    try:
        order_ref = db.collection('orders').document()
        order_ref.set({
            'userId': user_id,
            'items': data['items'],
            'total': data['total'],
            'address': data['address'],
            'status': 'pending',
            'createdAt': firestore.SERVER_TIMESTAMP
        })
        
        # 장바구니 비우기
        db.collection('carts').document(user_id).delete()
        
        return jsonify({'success': True, 'orderId': order_ref.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Vercel용 핸들러
def handler(request):
    return app(request)


if __name__ == '__main__':
    app.run(debug=True)
