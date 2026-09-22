package com.example.ForgeX.service;

import java.io.IOException;
import java.util.List;

import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.ForgeX.dto.ProductDTO;
import com.example.ForgeX.dto.ProductResponse;
import com.example.ForgeX.exceptions.ResourceNotFoundException;
import com.example.ForgeX.model.Category;
import com.example.ForgeX.model.Gender;
import com.example.ForgeX.model.Product;
import com.example.ForgeX.repository.ProductRepository;

@Service
@Transactional(readOnly = true)
public class ProductServiceImpl implements ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private FileService fileService;

    @Value("${project.image}")
    private String path;

    // ---------- Create ----------

    @Override
    @Transactional
    public ProductDTO addProduct(ProductDTO productDTO) {
        Product product = modelMapper.map(productDTO, Product.class);
        product.setProductId(null);                 // always create a new row
        if (product.getActive() == null) product.setActive(true);

        Product savedProduct = productRepository.save(product);
        return modelMapper.map(savedProduct, ProductDTO.class);
    }

    // ---------- Read ----------

    @Override
    public ProductResponse getAllProducts(Integer pageNumber, Integer pageSize,
                                          String sortBy, String sortOrder) {
        Page<Product> page = productRepository.findAll(
                buildPage(pageNumber, pageSize, sortBy, sortOrder));
        return buildResponse(page);
    }

    @Override
    public ProductResponse getProductByKeyWord(String keyword, Integer pageNumber, Integer pageSize,
                                               String sortBy, String sortOrder) {
        Page<Product> page = productRepository.findByNameLikeIgnoreCase(
                "%" + keyword + "%",
                buildPage(pageNumber, pageSize, sortBy, sortOrder));
        return buildResponse(page);
    }

    @Override
    public ProductResponse sortProductByCategory(String category, Integer pageNumber, Integer pageSize,
                                                 String sortBy, String sortOrder) {
        Category categoryEnum = Category.valueOf(category.toUpperCase());
        Page<Product> page = productRepository.findByCategory(
                categoryEnum,
                buildPage(pageNumber, pageSize, sortBy, sortOrder));
        return buildResponse(page);
    }

    @Override
    public ProductResponse sortProductByGender(String gender, Integer pageNumber, Integer pageSize,
                                               String sortBy, String sortOrder) {
        Gender genderEnum = Gender.valueOf(gender.toUpperCase());
        Page<Product> page = productRepository.findByGender(
                genderEnum,
                buildPage(pageNumber, pageSize, sortBy, sortOrder));
        return buildResponse(page);
    }

    // ---------- Update ----------

    @Override
    @Transactional
    public ProductDTO updateProduct(Long productId, ProductDTO productDTO) {
        Product productFromDB = findProduct(productId);

        productFromDB.setName(productDTO.getName());
        productFromDB.setSlug(productDTO.getSlug());
        productFromDB.setDescription(productDTO.getDescription());
        productFromDB.setCategory(productDTO.getCategory());
        productFromDB.setGender(productDTO.getGender());
        productFromDB.setFragranceFamily(productDTO.getFragranceFamily());
        productFromDB.setMrp(productDTO.getMrp());
        productFromDB.setPrice(productDTO.getPrice());
        productFromDB.setStock(productDTO.getStock());

        if (productDTO.getActive() != null) {
            productFromDB.setActive(productDTO.getActive());
        }
        // image is NOT touched here — use updateProductImage

        Product savedProduct = productRepository.save(productFromDB);
        return modelMapper.map(savedProduct, ProductDTO.class);
    }

    @Override
    @Transactional
    public ProductDTO updateProductImage(Long productId, MultipartFile image) throws IOException {
        Product productFromDB = findProduct(productId);

        String fileName = fileService.uploadImage(path, image);
        productFromDB.setImage(fileName);

        Product savedProduct = productRepository.save(productFromDB);
        return modelMapper.map(savedProduct, ProductDTO.class);
    }

    // ---------- Delete ----------

    @Override
    @Transactional
    public String deleteProduct(Long productId) {
        Product productFromDB = findProduct(productId);
        productRepository.delete(productFromDB);
        return "Product deleted successfully";
    }

    // ---------- Helpers ----------

    private Product findProduct(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "productId", productId));
    }

    private PageRequest buildPage(Integer pageNumber, Integer pageSize,
                                  String sortBy, String sortOrder) {
        Sort sort = sortOrder.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        return PageRequest.of(pageNumber, pageSize, sort);
    }

    private ProductResponse buildResponse(Page<Product> page) {
        List<ProductDTO> dtos = page.getContent().stream()
                .map(product -> modelMapper.map(product, ProductDTO.class))
                .toList();

        return new ProductResponse(
                dtos,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast());
    }
}