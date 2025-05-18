class ApplicationController < ActionController::Base
  protect_from_forgery except: :contour
  def contour
    if params.has_key?(:png_base64_image)
      dataurl = params[:png_base64_image]
      dataurl[0..21] = "" if dataurl.start_with?('data:image/png;base64,')
      png_bitmap = CPPRemotePngBitMap.new(dataurl)
      rgb_matcher = CPPRGBMatcher.new(255)
      polygonfinder = CPPPolygonFinder.new(png_bitmap,
        rgb_matcher,
        nil,
        {versus: :a, compress: {uniq: true, linear: true}})
      result = polygonfinder.process_info
    end
    respond_to do |format|
      format.json {render json: result || 'no data'}
    end
  end
end
